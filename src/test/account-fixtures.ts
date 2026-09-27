import type { SignedIn } from '../lib/account/application/sign-in.ts';
import type { LayoutData } from '../routes/+layout.ts';

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
