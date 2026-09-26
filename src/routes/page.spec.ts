import { afterEach, describe, expect, it, vi } from 'vitest';

import { startBrowserSession } from '../lib/session/interface/browser-session.ts';
import { memoryStorage } from '../test/memory-storage.ts';
import { PROGRAM_CARD, serveSessionView } from '../test/session-fixtures.ts';
import { load } from './+page.ts';

describe('load / в браузере', () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('отдаёт Программы и их Активные занятия', async () => {
		vi.stubGlobal('sessionStorage', memoryStorage());
		const programs = [PROGRAM_CARD];
		expect(await load({ data: { programs } })).toEqual({ programs, sessions: [] });
		const { session } = await startBrowserSession(PROGRAM_CARD, serveSessionView);
		expect(await load({ data: { programs } })).toEqual({ programs, sessions: [session] });
	});
});
