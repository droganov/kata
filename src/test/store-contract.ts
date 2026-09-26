import { describe, expect, it } from 'vitest';

import type { SessionView } from '../lib/session/application/session-views.ts';
import type { Store } from '../lib/session/application/store.ts';

import {
	ActiveSessionExistsError,
	NoActiveSessionError,
	NoSessionItemError
} from '../lib/session/application/store.ts';

export type StoreFactory = (now: () => Date) => Store;

export const SESSION_START = new Date('2026-09-14T08:00:00.000Z');

const ACCOUNT = 'person-a';
const OTHER_ACCOUNT = 'person-b';
const WINDOW_DAYS = 21;
const DAY_MS = 86_400_000;

const daysAfterStart = (days: number): Date => new Date(SESSION_START.getTime() + days * DAY_MS);

const itemOf = (ord: number, exercise: string): SessionView['blocks'][number]['items'][number] => ({
	detail: {
		equipment: [{ name: 'Тело', role: 'главное' }],
		steps: [],
		targets: [{ names: 'Ягодичные', role: 'Первичные' }]
	},
	dose: '3×12',
	exercise,
	name: exercise,
	ord
});

export const SESSION_VIEW: SessionView = {
	blocks: [
		{ id: 'block-warmup', items: [itemOf(1, 'ex-neck-roll')], name: 'Разминка' },
		{
			id: 'block-strength',
			items: [itemOf(2, 'ex-bridge'), itemOf(3, 'ex-press')],
			name: 'Силовой'
		}
	],
	program: 'program-1',
	seed: 7,
	title: 'Закрепления и добор'
};

export const describeStoreContract = (name: string, createStore: StoreFactory): void => {
	describe(`${name}: контракт Хранилища`, () => {
		it('без Активного занятия ничего не отдаёт', async () => {
			const store = createStore(() => SESSION_START);
			expect(await store.activeSession(ACCOUNT)).toBeUndefined();
		});

		it('кладёт собранное Занятие и делает его активным', async () => {
			const store = createStore(() => SESSION_START);
			const opened = await store.openSession(ACCOUNT, SESSION_VIEW);
			expect(opened).toEqual({
				account: ACCOUNT,
				marks: [],
				openedAt: SESSION_START.toISOString(),
				view: SESSION_VIEW
			});
			expect(await store.activeSession(ACCOUNT)).toEqual(opened);
		});

		it('не даёт открыть второе Активное занятие тому же Аккаунту', async () => {
			const store = createStore(() => SESSION_START);
			await store.openSession(ACCOUNT, SESSION_VIEW);
			await expect(store.openSession(ACCOUNT, SESSION_VIEW)).rejects.toThrow(
				ActiveSessionExistsError
			);
			await expect(store.openSession(ACCOUNT, SESSION_VIEW)).rejects.toThrow(
				'Активное занятие у Аккаунта уже есть'
			);
		});

		it('записывает Отметку в Активное занятие, повторная Отметка Позиции заменяет прежнюю', async () => {
			const store = createStore(() => SESSION_START);
			await store.openSession(ACCOUNT, SESSION_VIEW);
			await store.markExercise(ACCOUNT, { ord: 2, status: 'done' });
			await store.markExercise(ACCOUNT, { ord: 1, status: 'done' });
			const marked = await store.markExercise(ACCOUNT, { ord: 2, status: 'skipped' });
			expect(marked.marks).toEqual([
				{ ord: 1, status: 'done' },
				{ ord: 2, status: 'skipped' }
			]);
			expect(await store.activeSession(ACCOUNT)).toEqual(marked);
		});

		it('на Отметку без Активного занятия отвечает предметной ошибкой', async () => {
			const store = createStore(() => SESSION_START);
			await expect(store.markExercise(ACCOUNT, { ord: 1, status: 'done' })).rejects.toThrow(
				NoActiveSessionError
			);
			await expect(store.markExercise(ACCOUNT, { ord: 1, status: 'done' })).rejects.toThrow(
				'Активного занятия у Аккаунта нет'
			);
		});

		it('на Отметку Позиции, которой нет в Активном занятии, отвечает предметной ошибкой', async () => {
			const store = createStore(() => SESSION_START);
			await store.openSession(ACCOUNT, SESSION_VIEW);
			await expect(store.markExercise(ACCOUNT, { ord: 9, status: 'done' })).rejects.toThrow(
				NoSessionItemError
			);
			await expect(store.markExercise(ACCOUNT, { ord: 9, status: 'done' })).rejects.toThrow(
				'Позиции нет в Активном занятии'
			);
		});

		it('держит Историю доступной', async () => {
			const store = createStore(() => SESSION_START);
			expect(await store.isHistoryAvailable()).toBe(true);
		});

		it('при закрытии пишет в Историю только выполненное и снимает Активное занятие', async () => {
			let now = SESSION_START;
			const store = createStore(() => now);
			await store.openSession(ACCOUNT, SESSION_VIEW);
			await store.markExercise(ACCOUNT, { ord: 1, status: 'done' });
			await store.markExercise(ACCOUNT, { ord: 2, status: 'skipped' });
			now = daysAfterStart(1);
			await store.closeSession(ACCOUNT);
			expect(await store.activeSession(ACCOUNT)).toBeUndefined();
			expect(await store.recentExercises(ACCOUNT, WINDOW_DAYS)).toEqual([
				{ doneAt: daysAfterStart(1).toISOString(), exercise: 'ex-neck-roll' }
			]);
		});

		it('закрывает Занятие идемпотентно', async () => {
			const store = createStore(() => SESSION_START);
			await store.closeSession(ACCOUNT);
			await store.openSession(ACCOUNT, SESSION_VIEW);
			await store.markExercise(ACCOUNT, { ord: 3, status: 'done' });
			await store.closeSession(ACCOUNT);
			await store.closeSession(ACCOUNT);
			expect(await store.recentExercises(ACCOUNT, WINDOW_DAYS)).toEqual([
				{ doneAt: SESSION_START.toISOString(), exercise: 'ex-press' }
			]);
		});

		it('не возвращает из Истории выполненное раньше окна', async () => {
			let now = SESSION_START;
			const store = createStore(() => now);
			await store.openSession(ACCOUNT, SESSION_VIEW);
			await store.markExercise(ACCOUNT, { ord: 2, status: 'done' });
			await store.closeSession(ACCOUNT);
			now = daysAfterStart(WINDOW_DAYS);
			expect(await store.recentExercises(ACCOUNT, WINDOW_DAYS)).toHaveLength(1);
			now = daysAfterStart(WINDOW_DAYS + 1);
			expect(await store.recentExercises(ACCOUNT, WINDOW_DAYS)).toEqual([]);
		});

		it('не смешивает данные разных Аккаунтов', async () => {
			const store = createStore(() => SESSION_START);
			await store.openSession(ACCOUNT, SESSION_VIEW);
			await store.openSession(OTHER_ACCOUNT, SESSION_VIEW);
			await store.markExercise(ACCOUNT, { ord: 1, status: 'done' });
			await store.closeSession(ACCOUNT);
			const other = await store.activeSession(OTHER_ACCOUNT);
			expect(other?.marks).toEqual([]);
			expect(await store.recentExercises(OTHER_ACCOUNT, WINDOW_DAYS)).toEqual([]);
			expect(await store.recentExercises(ACCOUNT, WINDOW_DAYS)).toHaveLength(1);
		});
	});
};
