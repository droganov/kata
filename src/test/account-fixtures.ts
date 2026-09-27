import type { SignedIn } from '../lib/account/application/sign-in.ts';
import type { LayoutData } from '../routes/+layout.ts';

import {
	requestBrowserEmailCode,
	signedInBrowserAccount,
	signInBrowser
} from '../lib/account/interface/browser-account.ts';
import { ACCOUNT } from './session-fixtures.ts';

export const SIGNED_IN: SignedIn = {
	account: {
		createdAt: '2026-09-27T08:00:00.000Z',
		email: 'sergei@example.com',
		emailVerifiedAt: '2026-09-27T08:01:00.000Z',
		handle: 'ab'.repeat(64),
		id: ACCOUNT,
		nickname: 'Sergei'
	},
	authSession: {
		account: ACCOUNT,
		createdAt: '2026-09-27T08:01:00.000Z',
		deviceLabel: 'iPhone · Safari',
		id: '01a0e029-5400-7000-8000-000000000001',
		key: 'key-a',
		lastSeenAt: '2026-09-27T08:01:00.000Z',
		revokedAt: null
	}
};

export const signedInLayout = (): Promise<LayoutData> =>
	Promise.resolve({ hasExpiredSession: false, signedIn: SIGNED_IN });

export const serveNoContent = (): Promise<Response> =>
	Promise.resolve(new Response(null, { status: 204 }));

export const signedInBrowserAs = async (nickname: string, email: string): Promise<SignedIn> => {
	const person = await requestBrowserEmailCode(nickname, email);
	const authSession = await signInBrowser(person, '000000', serveNoContent);
	const signedIn = await signedInBrowserAccount(authSession?.id ?? null);
	if (signedIn === undefined) throw new Error('вход не состоялся');
	return signedIn;
};
