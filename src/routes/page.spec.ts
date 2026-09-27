import { afterEach, describe, expect, it, vi } from 'vitest';

import type { LayoutData } from './+layout.ts';

import { startBrowserSession } from '../lib/session/interface/browser-session.ts';
import { SIGNED_IN, signedInLayout } from '../test/account-fixtures.ts';
import { memoryStorage } from '../test/memory-storage.ts';
import { ACCOUNT, PROGRAM_CARD, serveSessionView } from '../test/session-fixtures.ts';
import { load } from './+page.ts';

describe('load / в браузере', () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('отдаёт вошедший Аккаунт, Программы и Активное занятие Аккаунта', async () => {
		vi.stubGlobal('sessionStorage', memoryStorage());
		const programs = [PROGRAM_CARD];
		expect(await load({ data: { programs }, parent: signedInLayout })).toEqual({
			programs,
			sessions: [],
			signedIn: SIGNED_IN
		});
		const { session } = await startBrowserSession(ACCOUNT, PROGRAM_CARD, serveSessionView);
		expect(await load({ data: { programs }, parent: signedInLayout })).toEqual({
			programs,
			sessions: [session],
			signedIn: SIGNED_IN
		});
	});

	it('без Сеанса Программы Аккаунта не читает', async () => {
		const parent = (): Promise<LayoutData> =>
			Promise.resolve({ hasExpiredSession: false, signedIn: undefined });
		expect(await load({ data: { programs: [PROGRAM_CARD] }, parent })).toEqual({
			signedIn: undefined
		});
	});
});
