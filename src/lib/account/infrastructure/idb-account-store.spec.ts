import { IDBDatabase, IDBFactory, IDBObjectStore } from 'fake-indexeddb';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { AccountStore } from '../application/account-store.ts';

import {
	describeAccountStoreContract,
	NEW_KEY,
	SIGNED_UP_AT
} from '../../../test/account-store-contract.ts';
import { memoryStorage } from '../../../test/memory-storage.ts';
import { AccountsUnavailableError } from '../application/account-store.ts';
import { createIdbAccountStore } from './idb-account-store.ts';

const STORED_DATABASE = 'training-account';
const LEGACY_VERSIONS = [1, 2];
const DEVICE_ACCOUNTS_VERSION = 2;
const NEWER_VERSION = 4;
const EMAIL = 'sergei@example.com';

const randomBytes = (length: number): Uint8Array => crypto.getRandomValues(new Uint8Array(length));

const storeOn = (indexedDB: IDBFactory | undefined): AccountStore =>
	createIdbAccountStore({
		indexedDB,
		now: () => SIGNED_UP_AT,
		randomBytes,
		storage: memoryStorage()
	});

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

const LIVE_SESSION = {
	account: STORED_PERSON.id,
	createdAt: '2026-09-27T08:01:00.000Z',
	deviceLabel: 'iPhone · Safari',
	id: '01a0e029-5400-7000-8000-00000000000a',
	key: 'key-a',
	lastSeenAt: '2026-09-27T08:01:00.000Z'
};

const REVOKED_SESSION = { ...LIVE_SESSION, id: '01a0e029-5400-7000-8000-00000000000b' };

const legacyFactory = async (version: number): Promise<IDBFactory> => {
	const factory = new IDBFactory();
	await new Promise<void>((resolve) => {
		const request = factory.open(STORED_DATABASE, version);
		request.addEventListener('upgradeneeded', () => {
			request.result
				.createObjectStore('person', { keyPath: 'id' })
				.createIndex('email', 'email', { unique: true });
			for (const table of ['email_code', 'credential', 'auth_session'])
				request.result
					.createObjectStore(table, { keyPath: 'id' })
					.createIndex('account', 'account');
			if (version >= DEVICE_ACCOUNTS_VERSION)
				request.result.createObjectStore('device_account', { keyPath: 'account' });
		});
		request.addEventListener('success', () => {
			const tables = ['person', 'email_code', 'auth_session'];
			const transaction = request.result.transaction(tables, 'readwrite');
			transaction.objectStore('person').add(STORED_PERSON);
			transaction.objectStore('email_code').add({
				account: STORED_PERSON.id,
				codeHash: 'hash',
				expiresAt: '2026-09-27T08:10:00.000Z',
				id: 'code-a',
				usedAt: '2026-09-27T08:01:00.000Z'
			});
			transaction.objectStore('auth_session').add({ ...LIVE_SESSION, revokedAt: null });
			transaction
				.objectStore('auth_session')
				.add({ ...REVOKED_SESSION, revokedAt: '2026-09-27T09:00:00.000Z' });
			transaction.addEventListener('complete', () => {
				request.result.close();
				resolve();
			});
		});
	});
	return factory;
};

const tablesIn = (factory: IDBFactory): Promise<readonly string[]> =>
	new Promise((resolve) => {
		const request = factory.open(STORED_DATABASE);
		request.addEventListener('success', () => {
			const tables = [...request.result.objectStoreNames];
			request.result.close();
			resolve(tables);
		});
	});

describeAccountStoreContract('Хранилище Аккаунтов в IndexedDB', (now) =>
	createIdbAccountStore({
		indexedDB: new IDBFactory(),
		now,
		randomBytes,
		storage: memoryStorage()
	})
);

describe('Код подтверждения почты', () => {
	it('живёт только в хранилище вкладки и уходит после подтверждения', async () => {
		const storage = memoryStorage();
		const factory = new IDBFactory();
		const store = createIdbAccountStore({
			indexedDB: factory,
			now: () => SIGNED_UP_AT,
			randomBytes,
			storage
		});
		const person = await store.registerAccount('Sergei', EMAIL);
		await store.issueEmailCode(person.id);
		expect(storage).toHaveLength(1);
		expect(await tablesIn(factory)).not.toContain('email_code');
		expect(await store.confirmEmail(person.id, '000000')).toBe(true);
		expect(storage).toHaveLength(0);
	});

	it('истёкший код уходит из хранилища вкладки при попытке', async () => {
		let now = SIGNED_UP_AT;
		const storage = memoryStorage();
		const store = createIdbAccountStore({
			indexedDB: new IDBFactory(),
			now: () => now,
			randomBytes,
			storage
		});
		const person = await store.registerAccount('Sergei', EMAIL);
		await store.issueEmailCode(person.id);
		now = new Date(SIGNED_UP_AT.getTime() + 600_000);
		expect(await store.confirmEmail(person.id, '000000')).toBe(false);
		expect(storage).toHaveLength(0);
	});

	it('повреждённую запись кода за код не принимает', async () => {
		const storage = memoryStorage();
		const store = createIdbAccountStore({
			indexedDB: new IDBFactory(),
			now: () => SIGNED_UP_AT,
			randomBytes,
			storage
		});
		const person = await store.registerAccount('Sergei', EMAIL);
		storage.setItem('training:email-code:' + person.id, '{');
		expect(await store.confirmEmail(person.id, '000000')).toBe(false);
	});
});

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
		await expect(store.attachKey(person.id, NEW_KEY)).rejects.toThrow(AccountsUnavailableError);
	});

	it.each(LEGACY_VERSIONS)(
		'поднимает базу версии %i: Аккаунты и живые Сеансы остаются, коды и погашенные Сеансы уходят',
		async (version) => {
			const factory = await legacyFactory(version);
			const store = storeOn(factory);
			expect(await store.account(STORED_PERSON.id)).toEqual(STORED_PERSON);
			expect(await store.authSession(LIVE_SESSION.id)).toEqual(LIVE_SESSION);
			expect(await store.authSession(REVOKED_SESSION.id)).toBeUndefined();
			expect(await store.knownAccounts()).toEqual([]);
			expect(await tablesIn(factory)).toEqual([
				'auth_session',
				'credential',
				'device_account',
				'person'
			]);
		}
	);

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
