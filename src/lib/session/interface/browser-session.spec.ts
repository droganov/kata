import { IDBFactory } from 'fake-indexeddb';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { memoryStorage } from '../../../test/memory-storage.ts';
import { PROGRAM_CARD, serveSessionView } from '../../../test/session-fixtures.ts';
import { startBrowserSession } from './browser-session.ts';

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
		expect(again.view).toEqual(first.view);
		expect(first.isHistoryWarningDue).toBe(false);
	});

	it('без IndexedDB предупреждает о потере Истории один раз за вкладку', async () => {
		vi.stubGlobal('sessionStorage', memoryStorage());
		const first = await startBrowserSession(PROGRAM_CARD, serveSessionView);
		const again = await startBrowserSession(PROGRAM_CARD, serveSessionView);
		expect([first.isHistoryWarningDue, again.isHistoryWarningDue]).toEqual([true, false]);
	});
});
