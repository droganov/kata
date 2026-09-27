import { IDBFactory } from 'fake-indexeddb';
import { describe, expect, it, vi } from 'vitest';

import type { Store } from './store.ts';

import { memoryStorage } from '../../../test/memory-storage.ts';
import { ACCOUNT } from '../../../test/session-fixtures.ts';
import { SESSION_START, SESSION_VIEW } from '../../../test/store-contract.ts';
import { createBrowserStore } from '../infrastructure/browser-store.ts';
import { startSession } from './start-session.ts';

const storeWith = (indexedDB: IDBFactory | undefined): Store =>
	createBrowserStore({ indexedDB, now: () => SESSION_START, storage: memoryStorage() });

describe('startSession', () => {
	it('без Активного занятия собирает новое и делает его активным', async () => {
		const store = storeWith(new IDBFactory());
		const assemble = vi.fn(() => Promise.resolve(SESSION_VIEW));
		const started = await startSession(store, ACCOUNT, assemble);
		const active = await store.activeSession(ACCOUNT);
		expect(started.isHistoryAvailable).toBe(true);
		expect(started.session.view).toEqual(SESSION_VIEW);
		expect(active?.view).toEqual(SESSION_VIEW);
		expect(assemble).toHaveBeenCalledOnce();
	});

	it('подаёт на сборку Историю Аккаунта', async () => {
		const store = storeWith(new IDBFactory());
		await store.openSession(ACCOUNT, SESSION_VIEW);
		await store.markExercise(ACCOUNT, { ord: 1, status: 'done' });
		await store.closeSession(ACCOUNT);
		const assemble = vi.fn(() => Promise.resolve(SESSION_VIEW));
		await startSession(store, ACCOUNT, assemble);
		expect(assemble).toHaveBeenCalledWith([
			{ doneAt: SESSION_START.toISOString(), exercise: 'ex-neck-roll' }
		]);
	});

	it('без IndexedDB собирает с пустой Историей', async () => {
		const assemble = vi.fn(() => Promise.resolve(SESSION_VIEW));
		await startSession(storeWith(undefined), ACCOUNT, assemble);
		expect(assemble).toHaveBeenCalledWith([]);
	});

	it('с Активным занятием возвращает к нему и не собирает новое', async () => {
		const store = storeWith(new IDBFactory());
		await store.openSession(ACCOUNT, SESSION_VIEW);
		const assemble = vi.fn(() => Promise.resolve({ ...SESSION_VIEW, seed: 8 }));
		const started = await startSession(store, ACCOUNT, assemble);
		expect(started.session.view).toEqual(SESSION_VIEW);
		expect(assemble).not.toHaveBeenCalled();
	});

	it('сообщает, что История недоступна, когда IndexedDB нет', async () => {
		const started = await startSession(storeWith(undefined), ACCOUNT, () =>
			Promise.resolve(SESSION_VIEW)
		);
		expect(started.isHistoryAvailable).toBe(false);
	});
});
