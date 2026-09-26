import { IDBFactory } from 'fake-indexeddb';
import { describe, expect, it } from 'vitest';

import type { Redraw } from '../domain/redraw.ts';
import type { SessionItemView, SessionView } from './session-views.ts';
import type { Performed, Store } from './store.ts';

import { memoryStorage } from '../../../test/memory-storage.ts';
import { SESSION_START, SESSION_VIEW } from '../../../test/store-contract.ts';
import { createBrowserStore } from '../infrastructure/browser-store.ts';
import {
	activeSessionsOf,
	isSessionRedrawable,
	redrawActiveSession,
	redrawSessionItem
} from './redraw-session.ts';
import { NoActiveSessionError, NoSessionItemError } from './store.ts';

const ACCOUNT = 'person-a';

const never = (): never => {
	throw new Error('пересборку не спрашивали');
};

const storeOf = (): Store =>
	createBrowserStore({
		indexedDB: new IDBFactory(),
		now: () => SESSION_START,
		storage: memoryStorage()
	});

const itemAt = (view: SessionView, ord: number): SessionItemView | undefined =>
	view.blocks.flatMap((block) => block.items).find((item) => item.ord === ord);

const withDoneBridge = async (store: Store): Promise<void> => {
	await store.openSession(ACCOUNT, SESSION_VIEW);
	await store.markExercise(ACCOUNT, { ord: 2, status: 'done' });
	await store.closeSession(ACCOUNT);
	await store.openSession(ACCOUNT, SESSION_VIEW);
};

describe('redrawSessionItem', () => {
	it('посылает на пересборку Позиции Занятия, отклонённое и Историю, кладёт ответ в Хранилище', async () => {
		const store = storeOf();
		await withDoneBridge(store);
		const asked: { history: readonly Performed[]; redraw: Redraw }[] = [];
		const replacement = { ...itemAt(SESSION_VIEW, 3)!, exercise: 'ex-fly', name: 'Сведение' };
		const redrawn = await redrawSessionItem(
			store,
			ACCOUNT,
			'exercise',
			3,
			(history, redraw) => {
				asked.push({ history, redraw });
				return Promise.resolve({
					item: replacement,
					options: [],
					rejected: { exercises: ['ex-press'], targets: [] }
				});
			}
		);
		expect(asked).toEqual([
			{
				history: [{ doneAt: SESSION_START.toISOString(), exercise: 'ex-bridge' }],
				redraw: {
					items: [
						{
							block: 'block-warmup',
							exercise: 'ex-neck-roll',
							ord: 1,
							target: 'target-ex-neck-roll'
						},
						{
							block: 'block-strength',
							exercise: 'ex-bridge',
							ord: 2,
							target: 'target-ex-bridge'
						},
						{
							block: 'block-strength',
							exercise: 'ex-press',
							ord: 3,
							target: 'target-ex-press'
						}
					],
					level: 'exercise',
					ord: 3,
					rejected: { exercises: [], targets: [] }
				}
			}
		]);
		expect(redrawn.isRedrawn).toBe(true);
		expect(itemAt(redrawn.session.view, 3)).toEqual({ ...replacement, drawNo: 2 });
		expect(redrawn.session.rejected).toEqual({ exercises: ['ex-press'], targets: [] });
		expect(await store.activeSession(ACCOUNT)).toEqual(redrawn.session);
	});

	it('без замены оставляет Занятие как было', async () => {
		const store = storeOf();
		const opened = await store.openSession(ACCOUNT, SESSION_VIEW);
		const redrawn = await redrawSessionItem(store, ACCOUNT, 'exercise', 1, () =>
			Promise.resolve(undefined)
		);
		expect(redrawn).toEqual({ isRedrawn: false, session: opened });
		expect(await store.activeSession(ACCOUNT)).toEqual(opened);
	});

	it('без Активного занятия или без такой Позиции отвечает предметной ошибкой и ничего не спрашивает', async () => {
		const store = storeOf();
		await expect(redrawSessionItem(store, ACCOUNT, 'exercise', 1, never)).rejects.toThrow(
			NoActiveSessionError
		);
		await store.openSession(ACCOUNT, SESSION_VIEW);
		await expect(redrawSessionItem(store, ACCOUNT, 'exercise', 9, never)).rejects.toThrow(
			NoSessionItemError
		);
	});
});

describe('redrawActiveSession', () => {
	it('собирает Занятие заново с Историей и заменяет им Активное занятие', async () => {
		const store = storeOf();
		await withDoneBridge(store);
		await redrawSessionItem(store, ACCOUNT, 'exercise', 3, () =>
			Promise.resolve({
				item: { ...itemAt(SESSION_VIEW, 3)!, exercise: 'ex-fly' },
				options: [],
				rejected: { exercises: ['ex-press'], targets: [] }
			})
		);
		const asked: (readonly Performed[])[] = [];
		const fresh = { ...SESSION_VIEW, seed: 8 };
		const redrawn = await redrawActiveSession(store, ACCOUNT, (history) => {
			asked.push(history);
			return Promise.resolve(fresh);
		});
		expect(asked).toEqual([[{ doneAt: SESSION_START.toISOString(), exercise: 'ex-bridge' }]]);
		expect(redrawn.view.seed).toBe(8);
		expect(redrawn.rejected).toEqual({ exercises: [], targets: [] });
		expect(itemAt(redrawn.view, 3)?.drawNo).toBe(3);
	});
});

describe('activeSessionsOf', () => {
	it('отдаёт Активные занятия Программ Аккаунта, пересобрать можно только без Отметок', async () => {
		const store = storeOf();
		const opened = await store.openSession(ACCOUNT, SESSION_VIEW);
		await store.openSession('person-b', SESSION_VIEW);
		const programs = [
			{ account: ACCOUNT, id: 'program-1', title: 'Закрепления и добор' },
			{ account: ACCOUNT, id: 'program-2', title: 'Другая' }
		];
		expect(await activeSessionsOf(store, programs)).toEqual([opened]);
		expect(isSessionRedrawable(opened)).toBe(true);
		const marked = await store.markExercise(ACCOUNT, { ord: 1, status: 'skipped' });
		expect(await activeSessionsOf(store, programs)).toEqual([marked]);
		expect(isSessionRedrawable(marked)).toBe(false);
	});
});
