import type { SignedIn } from '../lib/account/interface/browser-account.ts';

import { signedInBrowserAccount } from '../lib/account/interface/browser-account.ts';
import { closeExpiredBrowserSessions } from '../lib/session/interface/browser-session.ts';

export const ssr = false;

export interface LayoutData {
	readonly hasExpiredSession: boolean;
	readonly signedIn: SignedIn | undefined;
}

export const load = async ({
	data
}: {
	readonly data: { readonly authSession: null | string };
}): Promise<LayoutData> => {
	const expired = await closeExpiredBrowserSessions();
	return {
		hasExpiredSession: expired.length > 0,
		signedIn: await signedInBrowserAccount(data.authSession)
	};
};
