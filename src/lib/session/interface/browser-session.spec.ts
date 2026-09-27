import { IDBFactory } from 'fake-indexeddb';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { memoryStorage } from '../../../test/memory-storage.ts';
import { ACCOUNT, PROGRAM_CARD, serveSessionView } from '../../../test/session-fixtures.ts';
import { SESSION_VIEW } from '../../../test/store-contract.ts';
import {
	markBrowserSession,
	REDRAW_LEVEL,
	redrawBrowserSession,
	redrawBrowserSessionItem,
	sendBrowserMarks,
	startBrowserSession
} from './browser-session.ts';

describe('startBrowserSession', () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('держит Активное занятие в хранилище вкладки и возвращает к нему без сети', async () => {
		vi.stubGlobal('sessionStorage', memoryStorage());
		vi.stubGlobal('indexedDB', new IDBFactory());
		const first = await startBrowserSession(ACCOUNT, PROGRAM_CARD, serveSessionView);
		const again = await startBrowserSession(ACCOUNT, PROGRAM_CARD, () =>
			Promise.reject(new Error('сеть недоступна'))
		);
		expect(again.session.view).toEqual(first.session.view);
		expect(first.isHistoryWarningDue).toBe(false);
	});

	it('ставит Отметку в Активное занятие, и она переживает перезагрузку страницы', async () => {
		vi.stubGlobal('sessionStorage', memoryStorage());
		vi.stubGlobal('indexedDB', new IDBFactory());
		await startBrowserSession(ACCOUNT, PROGRAM_CARD, serveSessionView);
		const marked = await markBrowserSession(ACCOUNT, { ord: 2, status: 'done' });
		const reloaded = await startBrowserSession(ACCOUNT, PROGRAM_CARD, serveSessionView);
		expect(marked.session.marks).toEqual([{ ord: 2, status: 'done' }]);
		expect(reloaded.session.marks).toEqual([{ ord: 2, status: 'done' }]);
	});

	it('собирает новое Занятие вместо Активного занятия прежней формы', async () => {
		const storage = memoryStorage();
		vi.stubGlobal('sessionStorage', storage);
		vi.stubGlobal('indexedDB', new IDBFactory());
		const stale = {
			account: ACCOUNT,
			marks: [],
			openedAt: '2026-09-14T08:00:00.000Z',
			view: {
				blocks: [
					{
						id: 'block-warmup',
						items: [
							{
								detail: {
									equipment: 'Тело — main',
									steps: [],
									targets: 'Шея — primary'
								},
								dose: '2×10',
								exercise: 'ex-neck-roll',
								name: 'Круги головой',
								ord: 1
							}
						],
						name: 'Разминка'
					}
				],
				program: 'program-1',
				seed: 3,
				title: 'Закрепления и добор'
			}
		};
		storage.setItem(`training:active-session:${ACCOUNT}`, JSON.stringify(stale));
		const started = await startBrowserSession(ACCOUNT, PROGRAM_CARD, serveSessionView);
		expect(started.session.view).toEqual(SESSION_VIEW);
	});

	it('без IndexedDB предупреждает о потере Истории один раз за вкладку', async () => {
		vi.stubGlobal('sessionStorage', memoryStorage());
		const first = await startBrowserSession(ACCOUNT, PROGRAM_CARD, serveSessionView);
		const again = await startBrowserSession(ACCOUNT, PROGRAM_CARD, serveSessionView);
		expect([first.isHistoryWarningDue, again.isHistoryWarningDue]).toEqual([true, false]);
	});
});

describe('пересборка в браузере', () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('пересобирает Позицию через сервер и хранит замену в Активном занятии', async () => {
		vi.stubGlobal('sessionStorage', memoryStorage());
		vi.stubGlobal('indexedDB', new IDBFactory());
		const { session } = await startBrowserSession(ACCOUNT, PROGRAM_CARD, serveSessionView);
		const replacement = { ...SESSION_VIEW.blocks[1]!.items[1]!, exercise: 'ex-fly' };
		const asked: string[] = [];
		const redrawn = await redrawBrowserSessionItem(
			session,
			REDRAW_LEVEL.exercise,
			3,
			(input) => {
				asked.push(input);
				return Promise.resolve(
					Response.json({
						item: replacement,
						options: [],
						rejected: { exercises: [], targets: [] }
					})
				);
			}
		);
		expect(asked).toEqual(['/programs/program-1/session/redraw']);
		expect(redrawn.isRedrawn).toBe(true);
		const reloaded = await startBrowserSession(ACCOUNT, PROGRAM_CARD, serveSessionView);
		expect(reloaded.session.view.blocks[1]?.items[1]).toEqual({ ...replacement, drawNo: 2 });
	});

	it('пересобирает всё Занятие через сервер', async () => {
		vi.stubGlobal('sessionStorage', memoryStorage());
		vi.stubGlobal('indexedDB', new IDBFactory());
		const { session } = await startBrowserSession(ACCOUNT, PROGRAM_CARD, serveSessionView);
		const redrawn = await redrawBrowserSession(session, () =>
			Promise.resolve(Response.json({ ...SESSION_VIEW, seed: 8 }))
		);
		expect(redrawn.view.seed).toBe(8);
	});
});

describe('sendBrowserMarks', () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('Отметки без связи копятся во вкладке и уходят, когда связь вернулась', async () => {
		vi.stubGlobal('sessionStorage', memoryStorage());
		vi.stubGlobal('indexedDB', new IDBFactory());
		await startBrowserSession(ACCOUNT, PROGRAM_CARD, serveSessionView);
		await markBrowserSession(ACCOUNT, { ord: 1, status: 'done' });
		await markBrowserSession(ACCOUNT, { ord: 2, status: 'skipped' });
		const offline = await sendBrowserMarks(ACCOUNT, () =>
			Promise.reject(new TypeError('Failed to fetch'))
		);
		expect(offline).toEqual({ isReachable: false, unsent: 2 });
		const posted: unknown[] = [];
		const online = await sendBrowserMarks(ACCOUNT, (_input, init) => {
			if (typeof init?.body === 'string') posted.push(JSON.parse(init.body));
			return Promise.resolve(new Response(null, { status: 204 }));
		});
		expect(online).toEqual({ isReachable: true, unsent: 0 });
		expect(posted).toMatchObject([{ marks: [{ ord: 1 }, { ord: 2 }] }]);
	});
});
