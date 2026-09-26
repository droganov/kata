import { IDBFactory } from 'fake-indexeddb';
import { existsSync, readFileSync } from 'node:fs';
import { afterEach, expect, it, vi } from 'vitest';

import type { Store } from '../lib/session/application/store.ts';

import { createBrowserStore } from '../lib/session/infrastructure/browser-store.ts';
import { memoryStorage } from '../test/memory-storage.ts';
import { SESSION_VIEW } from '../test/store-contract.ts';
import { load, ssr } from './+layout.ts';

const APP_HTML = readFileSync('src/app.html', 'utf8');
const ACCOUNT = 'person-a';
const WINDOW_DAYS = 21;
const MINUTE_MS = 60_000;
const EXPIRY_MINUTES = 120;

const minutesAgo = (minutes: number): Date => new Date(Date.now() - minutes * MINUTE_MS);

const openedAt = async (moment: Date): Promise<void> => {
	const store = createBrowserStore({
		indexedDB,
		now: () => moment,
		storage: sessionStorage
	});
	await store.openSession(ACCOUNT, SESSION_VIEW);
	await store.markExercise(ACCOUNT, { ord: 1, status: 'done' });
};

const storedNow = (): Store =>
	createBrowserStore({ indexedDB, now: () => new Date(), storage: sessionStorage });

afterEach(() => {
	vi.unstubAllGlobals();
});

it('приложение остаётся клиентским: серверный рендер выключен', () => {
	expect(ssr).toBe(false);
});

it('при открытии приложения финализирует истёкшее Занятие и сообщает об этом', async () => {
	vi.stubGlobal('sessionStorage', memoryStorage());
	vi.stubGlobal('indexedDB', new IDBFactory());
	await openedAt(minutesAgo(EXPIRY_MINUTES + 1));
	expect(await load()).toEqual({ hasExpiredSession: true });
	expect(await storedNow().activeSession(ACCOUNT)).toBeUndefined();
	const performed = await storedNow().recentExercises(ACCOUNT, WINDOW_DAYS);
	expect(performed.map((entry) => entry.exercise)).toEqual(['ex-neck-roll']);
});

it('при открытии приложения не трогает Занятие, отмеченное меньше двух часов назад', async () => {
	vi.stubGlobal('sessionStorage', memoryStorage());
	vi.stubGlobal('indexedDB', new IDBFactory());
	await openedAt(minutesAgo(EXPIRY_MINUTES - 1));
	expect(await load()).toEqual({ hasExpiredSession: false });
	expect(await storedNow().activeSession(ACCOUNT)).toBeDefined();
});

it('иконки объявлены в разметке до запуска скриптов, и Safari и прочим есть что взять', () => {
	expect(APP_HTML).toContain('<link rel="icon" href="/favicon.ico" sizes="32x32" />');
	expect(APP_HTML).toContain('<link rel="icon" href="/favicon.svg" type="image/svg+xml" />');
	expect([existsSync('static/favicon.ico'), existsSync('static/favicon.svg')]).toEqual([
		true,
		true
	]);
});
