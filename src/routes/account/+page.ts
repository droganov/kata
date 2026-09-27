import type { LayoutData } from '../+layout.ts';
import type { SignedIn, SignedOut } from '../../lib/account/interface/browser-account.ts';

import { SIGNED_OUT } from '../../lib/account/interface/browser-account.ts';

export interface AccountScreen {
	readonly signedIn: SignedIn;
}

export const load = async ({
	parent
}: {
	readonly parent: () => Promise<LayoutData>;
}): Promise<AccountScreen | SignedOut> => {
	const { signedIn } = await parent();
	return signedIn === undefined ? SIGNED_OUT : { signedIn };
};
