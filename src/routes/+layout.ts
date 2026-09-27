import type { SignedIn } from '../lib/account/interface/browser-account.ts';

import { signedInBrowserAccount } from '../lib/account/interface/browser-account.ts';
import {
	closeExpiredBrowserSessions,
	SESSION_DEPENDENCY
} from '../lib/session/interface/browser-session.ts';

export const ssr = false;

export interface LayoutData {
	readonly hasExpiredSession: boolean;
	readonly signedIn: SignedIn | undefined;
}

export const load = async ({
	data,
	depends
}: {
	readonly data: { readonly authSession: null | string };
	readonly depends: (...dependencies: `${string}:${string}`[]) => void;
}): Promise<LayoutData> => {
	depends(SESSION_DEPENDENCY);
	const expired = await closeExpiredBrowserSessions();
	return {
		hasExpiredSession: expired.length > 0,
		signedIn: await signedInBrowserAccount(data.authSession)
	};
};
