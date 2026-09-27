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
const NEWER_VERSION = 2;
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
