import type { LayoutData } from '../+layout.ts';
import type {
	AuthSession,
	SignedIn,
	SignedOut
} from '../../lib/account/interface/browser-account.ts';

import { browserAuthSessions, SIGNED_OUT } from '../../lib/account/interface/browser-account.ts';

export interface AccountScreen {
	readonly authSessions: readonly AuthSession[];
	readonly signedIn: SignedIn;
}

export const load = async ({
	parent
}: {
	readonly parent: () => Promise<LayoutData>;
}): Promise<AccountScreen | SignedOut> => {
	const { signedIn } = await parent();
	if (signedIn === undefined) return SIGNED_OUT;
	return { authSessions: await browserAuthSessions(signedIn.account.id), signedIn };
};
