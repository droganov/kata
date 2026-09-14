import { IDBFactory, IDBObjectStore } from 'fake-indexeddb';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { Store } from '../application/store.ts';

import { memoryStorage } from '../../../test/memory-storage.ts';
import {
	describeStoreContract,
	SESSION_START,
	SESSION_VIEW
} from '../../../test/store-contract.ts';
import { createBrowserStore } from './browser-store.ts';

const ACCOUNT = 'person-a';
const WINDOW_DAYS = 21;
const STORED_DATABASE = 'training';
const NEWER_VERSION = 2;

const now = (): Date => SESSION_START;

const storeOn = (indexedDB: IDBFactory | undefined, storage = memoryStorage()): Store =>
	createBrowserStore({ indexedDB, now, storage });

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

const deleteStoredDatabase = (factory: IDBFactory): Promise<void> =>
	new Promise((resolve) => {
		factory.deleteDatabase(STORED_DATABASE).addEventListener('success', () => {
			resolve();
		});
	});

const closeDoneSession = async (store: Store): Promise<void> => {
	await store.openSession(ACCOUNT, SESSION_VIEW);
	await store.markExercise(ACCOUNT, { ord: 1, status: 'done' });
	await store.closeSession(ACCOUNT);
};

describeStoreContract('Хранилище браузера', (clock) =>
	createBrowserStore({ indexedDB: new IDBFactory(), now: clock, storage: memoryStorage() })
);

describe('createBrowserStore', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('переживает перезагрузку страницы: Активное занятие и История остаются', async () => {
		const indexedDB = new IDBFactory();
		const storage = memoryStorage();
		const before = storeOn(indexedDB, storage);
		await closeDoneSession(before);
		const opened = await before.openSession(ACCOUNT, SESSION_VIEW);
		const after = storeOn(indexedDB, storage);
		expect(await after.activeSession(ACCOUNT)).toEqual(opened);
		expect(await after.recentExercises(ACCOUNT, WINDOW_DAYS)).toEqual([
			{ doneAt: SESSION_START.toISOString(), exercise: 'ex-neck-roll' }
		]);
	});

	describe.each([
		['IndexedDB нет в браузере', () => Promise.resolve(undefined)],
		['IndexedDB запрещена', () => Promise.resolve(REFUSING_FACTORY)],
		['IndexedDB отказывается открыть базу', newerDatabaseFactory]
	])('%s', (_case, factoryOf: () => Promise<IDBFactory | undefined>) => {
		it('Занятие проходится, а История недоступна и пуста', async () => {
			const store = storeOn(await factoryOf());
			await closeDoneSession(store);
			expect(await store.activeSession(ACCOUNT)).toBeUndefined();
			expect(await store.recentExercises(ACCOUNT, WINDOW_DAYS)).toEqual([]);
			expect(await store.isHistoryAvailable()).toBe(false);
		});
	});

	it('когда базу закрыли посреди работы, История становится недоступной, а Занятие проходится', async () => {
		const indexedDB = new IDBFactory();
		const store = storeOn(indexedDB);
		await closeDoneSession(store);
		await deleteStoredDatabase(indexedDB);
		await closeDoneSession(store);
		expect(await store.activeSession(ACCOUNT)).toBeUndefined();
		expect(await store.recentExercises(ACCOUNT, WINDOW_DAYS)).toEqual([]);
		expect(await store.isHistoryAvailable()).toBe(false);
	});

	it('когда запись в Историю сорвалась, объявляет Историю недоступной, а не теряет выполненное молча', async () => {
		vi.spyOn(IDBObjectStore.prototype, 'put').mockImplementation(() => {
			throw new DOMException('Место на устройстве закончилось', 'QuotaExceededError');
		});
		const store = storeOn(new IDBFactory());
		await closeDoneSession(store);
		expect(await store.activeSession(ACCOUNT)).toBeUndefined();
		expect(await store.isHistoryAvailable()).toBe(false);
	});
});
