import { IDBFactory } from 'fake-indexeddb';
import { describe, expect, it } from 'vitest';

import type { Store } from './store.ts';
import type { UnsentMarks } from './unsent-marks.ts';

import { memoryStorage } from '../../../test/memory-storage.ts';
import { SESSION_START, SESSION_VIEW } from '../../../test/store-contract.ts';
import { createBrowserStore } from '../infrastructure/browser-store.ts';
import { createStoredUnsentMarks } from '../infrastructure/stored-unsent-marks.ts';
import { closeExpiredSessions, markSessionItem } from './session-lifecycle.ts';

const ACCOUNT = 'person-a';
const OTHER_ACCOUNT = 'person-b';
const WINDOW_DAYS = 21;
const MINUTE_MS = 60_000;
const EXPIRY_MINUTES = 120;

const minutesAfterStart = (minutes: number): Date =>
	new Date(SESSION_START.getTime() + minutes * MINUTE_MS);

interface ClockedStore {
	readonly at: (moment: Date) => void;
	readonly store: Store;
	readonly unsentMarks: UnsentMarks;
}

const clockedStore = (): ClockedStore => {
	let now = SESSION_START;
	const storage = memoryStorage();
	return {
		at: (moment) => {
			now = moment;
		},
		store: createBrowserStore({
			indexedDB: new IDBFactory(),
			now: () => now,
			storage
		}),
		unsentMarks: createStoredUnsentMarks(storage)
	};
};

describe('closeExpiredSessions', () => {
	it('финализирует Занятие через два часа после последней Отметки', async () => {
		const { at, store } = clockedStore();
		await store.openSession(ACCOUNT, SESSION_VIEW);
		at(minutesAfterStart(30));
		await store.markExercise(ACCOUNT, { ord: 1, status: 'done' });
		await store.markExercise(ACCOUNT, { ord: 2, status: 'skipped' });
		at(minutesAfterStart(30 + EXPIRY_MINUTES));
		expect(await closeExpiredSessions(store, minutesAfterStart(30 + EXPIRY_MINUTES))).toEqual([
			ACCOUNT
		]);
		expect(await store.activeSession(ACCOUNT)).toBeUndefined();
		expect(await store.recentExercises(ACCOUNT, WINDOW_DAYS)).toEqual([
			{
				doneAt: minutesAfterStart(30).toISOString(),
				exercise: 'ex-neck-roll'
			}
		]);
	});

	it('не трогает Занятие, пока два часа от последней Отметки не прошли', async () => {
		const { at, store } = clockedStore();
		await store.openSession(ACCOUNT, SESSION_VIEW);
		at(minutesAfterStart(30));
		await store.markExercise(ACCOUNT, { ord: 1, status: 'done' });
		const before = minutesAfterStart(30 + EXPIRY_MINUTES - 1);
		expect(await closeExpiredSessions(store, before)).toEqual([]);
		expect(await store.activeSession(ACCOUNT)).toBeDefined();
	});

	it('без Отметок считает два часа от открытия Занятия', async () => {
		const { store } = clockedStore();
		await store.openSession(ACCOUNT, SESSION_VIEW);
		expect(await closeExpiredSessions(store, minutesAfterStart(EXPIRY_MINUTES))).toEqual([
			ACCOUNT
		]);
		expect(await store.activeSession(ACCOUNT)).toBeUndefined();
	});

	it('читает все Активные занятия и финализирует только истёкшие', async () => {
		const { at, store } = clockedStore();
		await store.openSession(ACCOUNT, SESSION_VIEW);
		at(minutesAfterStart(EXPIRY_MINUTES));
		await store.openSession(OTHER_ACCOUNT, SESSION_VIEW);
		expect(await closeExpiredSessions(store, minutesAfterStart(EXPIRY_MINUTES))).toEqual([
			ACCOUNT
		]);
		const active = await store.activeSessions();
		expect(active.map((session) => session.account)).toEqual([OTHER_ACCOUNT]);
	});

	it('без Активных занятий ничего не финализирует', async () => {
		const { store } = clockedStore();
		expect(await closeExpiredSessions(store, SESSION_START)).toEqual([]);
	});
});

describe('markSessionItem', () => {
	it('ставит Отметку и оставляет Занятие активным, пока есть неотмеченные Позиции', async () => {
		const { store, unsentMarks } = clockedStore();
		await store.openSession(ACCOUNT, SESSION_VIEW);
		const marked = await markSessionItem(store, unsentMarks, ACCOUNT, {
			ord: 1,
			status: 'done'
		});
		expect(marked).toMatchObject({ isFinalized: false, session: { marks: [{ ord: 1 }] } });
		expect(await store.activeSession(ACCOUNT)).toBeDefined();
	});

	it('кладёт каждую Отметку в очередь неотправленных, повторная заменяет прежнюю', async () => {
		const { at, store, unsentMarks } = clockedStore();
		await store.openSession(ACCOUNT, SESSION_VIEW);
		at(minutesAfterStart(5));
		await markSessionItem(store, unsentMarks, ACCOUNT, { ord: 2, status: 'done' });
		at(minutesAfterStart(10));
		await markSessionItem(store, unsentMarks, ACCOUNT, { ord: 2, status: 'skipped' });
		expect(unsentMarks.unsent(ACCOUNT)).toEqual([
			{
				exercise: 'ex-bridge',
				markedAt: minutesAfterStart(10).toISOString(),
				ord: 2,
				program: SESSION_VIEW.program,
				seed: SESSION_VIEW.seed,
				status: 'skipped'
			}
		]);
	});

	it('Отметки финализированного Занятия остаются в очереди до отправки', async () => {
		const { store, unsentMarks } = clockedStore();
		await store.openSession(ACCOUNT, SESSION_VIEW);
		for (const ord of [1, 2, 3])
			await markSessionItem(store, unsentMarks, ACCOUNT, { ord, status: 'done' });
		expect(await store.activeSession(ACCOUNT)).toBeUndefined();
		expect(unsentMarks.unsent(ACCOUNT)).toHaveLength(3);
	});

	it('финализирует Занятие, когда отмечена последняя Позиция', async () => {
		const { store, unsentMarks } = clockedStore();
		await store.openSession(ACCOUNT, SESSION_VIEW);
		await markSessionItem(store, unsentMarks, ACCOUNT, { ord: 1, status: 'done' });
		await markSessionItem(store, unsentMarks, ACCOUNT, { ord: 3, status: 'skipped' });
		const marked = await markSessionItem(store, unsentMarks, ACCOUNT, {
			ord: 2,
			status: 'done'
		});
		expect(marked.isFinalized).toBe(true);
		expect(await store.activeSession(ACCOUNT)).toBeUndefined();
		const performed = await store.recentExercises(ACCOUNT, WINDOW_DAYS);
		expect(performed.map((entry) => entry.exercise)).toEqual(['ex-neck-roll', 'ex-bridge']);
	});
});
