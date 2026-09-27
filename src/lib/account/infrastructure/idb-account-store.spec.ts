import { IDBDatabase, IDBFactory, IDBObjectStore } from 'fake-indexeddb';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { AccountStore } from '../application/account-store.ts';

import {
	describeAccountStoreContract,
	SIGNED_UP_AT
} from '../../../test/account-store-contract.ts';
import { AccountsUnavailableError } from '../application/account-store.ts';
import { createIdbAccountStore } from './idb-account-store.ts';

const STORED_DATABASE = 'training-account';
const FIRST_VERSION = 1;
const NEWER_VERSION = 3;
const EMAIL = 'sergei@example.com';

const randomBytes = (length: number): Uint8Array => crypto.getRandomValues(new Uint8Array(length));

const storeOn = (indexedDB: IDBFactory | undefined): AccountStore =>
	createIdbAccountStore({ indexedDB, now: () => SIGNED_UP_AT, randomBytes });

const refuse = (): never => {
	throw new DOMException('Доступ к IndexedDB запрещён', 'SecurityError');
};

const REFUSING_FACTORY: IDBFactory = {
	cmp: () => 0,
	databases: () => Promise.resolve([]),
	deleteDatabase: refuse,
	open: refuse
};

const newerDatabaseFactory = async (): Promise<IDBFactory> => {
	const factory = new IDBFactory();
	await new Promise<void>((resolve) => {
		const request = factory.open(STORED_DATABASE, NEWER_VERSION);
		request.addEventListener('success', () => {
			request.result.close();
			resolve();
		});
	});
	return factory;
};

const STORED_PERSON = {
	createdAt: '2026-09-27T08:00:00.000Z',
	email: EMAIL,
	emailVerifiedAt: '2026-09-27T08:01:00.000Z',
	handle: 'ab'.repeat(64),
	id: '01a0e029-5400-7000-8000-000000000009',
	nickname: 'Sergei'
};

const firstVersionFactory = async (): Promise<IDBFactory> => {
	const factory = new IDBFactory();
	await new Promise<void>((resolve) => {
		const request = factory.open(STORED_DATABASE, FIRST_VERSION);
		request.addEventListener('upgradeneeded', () => {
			request.result
				.createObjectStore('person', { keyPath: 'id' })
				.createIndex('email', 'email', { unique: true });
			for (const table of ['email_code', 'credential', 'auth_session'])
				request.result
					.createObjectStore(table, { keyPath: 'id' })
					.createIndex('account', 'account');
		});
		request.addEventListener('success', () => {
			const transaction = request.result.transaction('person', 'readwrite');
			transaction.objectStore('person').add(STORED_PERSON);
			transaction.addEventListener('complete', () => {
				request.result.close();
				resolve();
			});
		});
	});
	return factory;
};

describeAccountStoreContract('Хранилище Аккаунтов в IndexedDB', (now) =>
	createIdbAccountStore({ indexedDB: new IDBFactory(), now, randomBytes })
);

describe('Хранилище Аккаунтов при отказе устройства', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('без IndexedDB сообщает, что устройство не хранит Аккаунты', async () => {
		await expect(storeOn(undefined).accountByEmail(EMAIL)).rejects.toThrow(
			AccountsUnavailableError
		);
		await expect(storeOn(undefined).accountByEmail(EMAIL)).rejects.toThrow(
			'Устройство не хранит Аккаунты'
		);
	});

	it('при запрете доступа к IndexedDB сообщает о том же', async () => {
		await expect(storeOn(REFUSING_FACTORY).accountByEmail(EMAIL)).rejects.toThrow(
			AccountsUnavailableError
		);
	});

	it('когда база новее приложения, сообщает о том же', async () => {
		const store = storeOn(await newerDatabaseFactory());
		await expect(store.accountByEmail(EMAIL)).rejects.toThrow(AccountsUnavailableError);
	});

	it('когда база не открывает обращение, сообщает о том же', async () => {
		const store = storeOn(new IDBFactory());
		await store.accountByEmail(EMAIL);
		vi.spyOn(IDBDatabase.prototype, 'transaction').mockImplementation(() => {
			throw new DOMException('База закрыта', 'InvalidStateError');
		});
		await expect(store.accountByEmail(EMAIL)).rejects.toThrow(AccountsUnavailableError);
	});

	it('когда запись срывается посреди обращения, сообщает о том же', async () => {
		const store = storeOn(new IDBFactory());
		const person = await store.registerAccount('Sergei', EMAIL);
		vi.spyOn(IDBObjectStore.prototype, 'add').mockImplementation(() => {
			throw new DOMException('Место на устройстве закончилось', 'QuotaExceededError');
		});
		await expect(store.issueEmailCode(person.id)).rejects.toThrow(AccountsUnavailableError);
	});

	it('поднимает базу первой версии, Аккаунты остаются, список устройства пуст', async () => {
		const store = storeOn(await firstVersionFactory());
		expect(await store.account(STORED_PERSON.id)).toEqual(STORED_PERSON);
		expect(await store.knownAccounts()).toEqual([]);
	});

	it('уступает базу новой версии приложения', async () => {
		const factory = new IDBFactory();
		await storeOn(factory).accountByEmail(EMAIL);
		const upgraded = await new Promise<number>((resolve) => {
			const request = factory.open(STORED_DATABASE, NEWER_VERSION);
			request.addEventListener('success', () => {
				request.result.close();
				resolve(request.result.version);
			});
		});
		expect(upgraded).toBe(NEWER_VERSION);
	});
});
