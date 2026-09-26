import { describe, expect, it } from 'vitest';

import type { SessionView } from '../lib/session/application/session-views.ts';
import type { Store } from '../lib/session/application/store.ts';

import {
	ActiveSessionExistsError,
	MarkedSessionItemError,
	NoActiveSessionError,
	NoSessionItemError
} from '../lib/session/application/store.ts';

export type StoreFactory = (now: () => Date) => Store;

export const SESSION_START = new Date('2026-09-14T08:00:00.000Z');

const ACCOUNT = 'person-a';
const OTHER_ACCOUNT = 'person-b';
const WINDOW_DAYS = 21;
const LONG_AGO_DAYS = 365;
const DAY_MS = 86_400_000;
const HOUR_MS = 3_600_000;
const NOTHING_REJECTED = { exercises: [], targets: [] };

const hoursAfterStart = (hours: number): Date =>
	new Date(SESSION_START.getTime() + hours * HOUR_MS);

const daysAfterStart = (days: number): Date => new Date(SESSION_START.getTime() + days * DAY_MS);

const itemOf = (ord: number, exercise: string): SessionView['blocks'][number]['items'][number] => ({
	detail: {
		equipment: [{ name: 'Тело', role: 'главное' }],
		steps: [],
		targets: [{ names: 'Ягодичные', role: 'Первичные' }]
	},
	dose: '3×12',
	drawNo: 1,
	exercise,
	isTargetRedrawable: true,
	name: exercise,
	ord,
	target: `target-${exercise}`
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
				markedAt: SESSION_START.toISOString(),
				marks: [],
				openedAt: SESSION_START.toISOString(),
				rejected: { exercises: [], targets: [] },
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

		it('пишет время Отметки, чтение Активных занятий его не двигает', async () => {
			let now = SESSION_START;
			const store = createStore(() => now);
			await store.openSession(ACCOUNT, SESSION_VIEW);
			now = hoursAfterStart(1);
			await store.markExercise(ACCOUNT, { ord: 1, status: 'done' });
			now = hoursAfterStart(3);
			await store.activeSession(ACCOUNT);
			await store.activeSessions();
			const active = await store.activeSession(ACCOUNT);
			expect(active?.markedAt).toBe(hoursAfterStart(1).toISOString());
		});

		it('отдаёт все Активные занятия устройства', async () => {
			const store = createStore(() => SESSION_START);
			expect(await store.activeSessions()).toEqual([]);
			await store.openSession(ACCOUNT, SESSION_VIEW);
			await store.openSession(OTHER_ACCOUNT, SESSION_VIEW);
			await store.closeSession(ACCOUNT);
			const active = await store.activeSessions();
			expect(active.map((session) => session.account)).toEqual([OTHER_ACCOUNT]);
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

		it('пересобирает Позицию: заменяет её, растит счётчик сборок и копит отклонённое', async () => {
			const store = createStore(() => SESSION_START);
			await store.openSession(ACCOUNT, SESSION_VIEW);
			await store.markExercise(ACCOUNT, { ord: 1, status: 'done' });
			await store.redrawItem(ACCOUNT, itemOf(3, 'ex-fly'), {
				exercises: ['ex-press'],
				targets: []
			});
			const redrawn = await store.redrawItem(ACCOUNT, itemOf(3, 'ex-dip'), {
				exercises: ['ex-fly', 'ex-press'],
				targets: ['target-ex-fly']
			});
			expect(redrawn.view.blocks[1]?.items).toEqual([
				itemOf(2, 'ex-bridge'),
				{ ...itemOf(3, 'ex-dip'), drawNo: 3 }
			]);
			expect(redrawn.rejected).toEqual({
				exercises: ['ex-press', 'ex-fly'],
				targets: ['target-ex-fly']
			});
			expect(redrawn.marks).toEqual([{ ord: 1, status: 'done' }]);
			expect(redrawn.markedAt).toBe(SESSION_START.toISOString());
			expect(await store.activeSession(ACCOUNT)).toEqual(redrawn);
		});

		it('не пересобирает отмеченную Позицию, выполненную или пропущенную', async () => {
			const store = createStore(() => SESSION_START);
			await store.openSession(ACCOUNT, SESSION_VIEW);
			await store.markExercise(ACCOUNT, { ord: 1, status: 'done' });
			await store.markExercise(ACCOUNT, { ord: 2, status: 'skipped' });
			for (const ord of [1, 2]) {
				const redraw = store.redrawItem(ACCOUNT, itemOf(ord, 'ex-fly'), NOTHING_REJECTED);
				await expect(redraw).rejects.toThrow(MarkedSessionItemError);
				await expect(redraw).rejects.toThrow('Позиция уже отмечена');
			}
			const kept = await store.activeSession(ACCOUNT);
			expect(kept?.view).toEqual(SESSION_VIEW);
		});

		it('на пересборку Позиции без Активного занятия или без такой Позиции отвечает предметной ошибкой', async () => {
			const store = createStore(() => SESSION_START);
			await expect(
				store.redrawItem(ACCOUNT, itemOf(1, 'ex-fly'), NOTHING_REJECTED)
			).rejects.toThrow(NoActiveSessionError);
			await store.openSession(ACCOUNT, SESSION_VIEW);
			await expect(
				store.redrawItem(ACCOUNT, itemOf(9, 'ex-fly'), NOTHING_REJECTED)
			).rejects.toThrow(NoSessionItemError);
		});

		it('пересобирает всё Занятие: сбрасывает отклонённое и растит счётчик сборок каждой Позиции', async () => {
			const store = createStore(() => SESSION_START);
			const opened = await store.openSession(ACCOUNT, SESSION_VIEW);
			await store.redrawItem(ACCOUNT, itemOf(3, 'ex-fly'), {
				exercises: ['ex-press'],
				targets: []
			});
			const fresh: SessionView = {
				...SESSION_VIEW,
				blocks: [
					{
						id: 'block-strength',
						items: [
							itemOf(1, 'ex-press'),
							itemOf(2, 'ex-row'),
							itemOf(3, 'ex-row'),
							itemOf(4, 'ex-dip')
						],
						name: 'Силовой'
					}
				],
				seed: 8
			};
			const redrawn = await store.redrawSession(ACCOUNT, fresh);
			expect(redrawn.view.seed).toBe(8);
			expect(
				redrawn.view.blocks[0]?.items.map((item) => [item.exercise, item.drawNo])
			).toEqual([
				['ex-press', 2],
				['ex-row', 2],
				['ex-row', 3],
				['ex-dip', 1]
			]);
			expect(redrawn.rejected).toEqual(NOTHING_REJECTED);
			expect(redrawn.openedAt).toBe(opened.openedAt);
			expect(await store.activeSession(ACCOUNT)).toEqual(redrawn);
		});

		it('не пересобирает всё Занятие, когда в нём есть Отметка, и без Активного занятия', async () => {
			const store = createStore(() => SESSION_START);
			await expect(store.redrawSession(ACCOUNT, SESSION_VIEW)).rejects.toThrow(
				NoActiveSessionError
			);
			await store.openSession(ACCOUNT, SESSION_VIEW);
			await store.markExercise(ACCOUNT, { ord: 3, status: 'skipped' });
			await expect(store.redrawSession(ACCOUNT, SESSION_VIEW)).rejects.toThrow(
				MarkedSessionItemError
			);
		});

		it('не пишет отклонённое в Историю', async () => {
			const store = createStore(() => SESSION_START);
			await store.openSession(ACCOUNT, SESSION_VIEW);
			await store.redrawItem(ACCOUNT, itemOf(2, 'ex-fly'), {
				exercises: ['ex-bridge'],
				targets: []
			});
			for (const ord of [1, 2, 3]) await store.markExercise(ACCOUNT, { ord, status: 'done' });
			await store.closeSession(ACCOUNT);
			const history = await store.recentExercises(ACCOUNT, WINDOW_DAYS);
			expect(history.map((entry) => entry.exercise)).toEqual([
				'ex-neck-roll',
				'ex-fly',
				'ex-press'
			]);
		});

		it('держит Историю доступной', async () => {
			const store = createStore(() => SESSION_START);
			expect(await store.isHistoryAvailable()).toBe(true);
		});

		it('при закрытии пишет в Историю только выполненное со временем последней Отметки и снимает Активное занятие', async () => {
			let now = SESSION_START;
			const store = createStore(() => now);
			await store.openSession(ACCOUNT, SESSION_VIEW);
			await store.markExercise(ACCOUNT, { ord: 1, status: 'done' });
			await store.markExercise(ACCOUNT, { ord: 2, status: 'skipped' });
			now = daysAfterStart(1);
			await store.closeSession(ACCOUNT);
			expect(await store.activeSession(ACCOUNT)).toBeUndefined();
			expect(await store.recentExercises(ACCOUNT, WINDOW_DAYS)).toEqual([
				{ doneAt: SESSION_START.toISOString(), exercise: 'ex-neck-roll' }
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

		it('при записи в Историю чистит выполненное раньше окна', async () => {
			let now = SESSION_START;
			const store = createStore(() => now);
			await store.openSession(ACCOUNT, SESSION_VIEW);
			await store.markExercise(ACCOUNT, { ord: 1, status: 'done' });
			await store.closeSession(ACCOUNT);
			now = daysAfterStart(WINDOW_DAYS + 1);
			await store.openSession(ACCOUNT, SESSION_VIEW);
			await store.markExercise(ACCOUNT, { ord: 2, status: 'done' });
			await store.closeSession(ACCOUNT);
			expect(await store.recentExercises(ACCOUNT, LONG_AGO_DAYS)).toEqual([
				{ doneAt: daysAfterStart(WINDOW_DAYS + 1).toISOString(), exercise: 'ex-bridge' }
			]);
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
