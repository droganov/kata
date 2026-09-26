import { IDBFactory } from 'fake-indexeddb';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { memoryStorage } from '../../../test/memory-storage.ts';
import { PROGRAM_CARD, serveSessionView } from '../../../test/session-fixtures.ts';
import { SESSION_VIEW } from '../../../test/store-contract.ts';
import { markBrowserSession, startBrowserSession } from './browser-session.ts';

describe('startBrowserSession', () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('держит Активное занятие в хранилище вкладки и возвращает к нему без сети', async () => {
		vi.stubGlobal('sessionStorage', memoryStorage());
		vi.stubGlobal('indexedDB', new IDBFactory());
		const first = await startBrowserSession(PROGRAM_CARD, serveSessionView);
		const again = await startBrowserSession(PROGRAM_CARD, () =>
			Promise.reject(new Error('сеть недоступна'))
		);
		expect(again.session.view).toEqual(first.session.view);
		expect(first.isHistoryWarningDue).toBe(false);
	});

	it('ставит Отметку в Активное занятие, и она переживает перезагрузку страницы', async () => {
		vi.stubGlobal('sessionStorage', memoryStorage());
		vi.stubGlobal('indexedDB', new IDBFactory());
		await startBrowserSession(PROGRAM_CARD, serveSessionView);
		const marked = await markBrowserSession(PROGRAM_CARD.account, { ord: 2, status: 'done' });
		const reloaded = await startBrowserSession(PROGRAM_CARD, serveSessionView);
		expect(marked.session.marks).toEqual([{ ord: 2, status: 'done' }]);
		expect(reloaded.session.marks).toEqual([{ ord: 2, status: 'done' }]);
	});

	it('собирает новое Занятие вместо Активного занятия прежней формы', async () => {
		const storage = memoryStorage();
		vi.stubGlobal('sessionStorage', storage);
		vi.stubGlobal('indexedDB', new IDBFactory());
		const stale = {
			account: PROGRAM_CARD.account,
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
		storage.setItem(`training:active-session:${PROGRAM_CARD.account}`, JSON.stringify(stale));
		const started = await startBrowserSession(PROGRAM_CARD, serveSessionView);
		expect(started.session.view).toEqual(SESSION_VIEW);
	});

	it('без IndexedDB предупреждает о потере Истории один раз за вкладку', async () => {
		vi.stubGlobal('sessionStorage', memoryStorage());
		const first = await startBrowserSession(PROGRAM_CARD, serveSessionView);
		const again = await startBrowserSession(PROGRAM_CARD, serveSessionView);
		expect([first.isHistoryWarningDue, again.isHistoryWarningDue]).toEqual([true, false]);
	});
});
