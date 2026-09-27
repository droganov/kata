import type {
	DeviceAccount,
	SignedIn,
	SignedOut
} from '../lib/account/interface/browser-account.ts';
import type { ProgramCardView } from '../lib/session/application/session-views.ts';
import type { ActiveSession } from '../lib/session/application/store.ts';
import type { LayoutData } from './+layout.ts';

import { otherBrowserAccounts, SIGNED_OUT } from '../lib/account/interface/browser-account.ts';
import { activeBrowserSessions } from '../lib/session/interface/browser-session.ts';

export interface ProgramList {
	readonly accounts: readonly DeviceAccount[];
	readonly programs: readonly ProgramCardView[];
	readonly sessions: readonly ActiveSession[];
	readonly signedIn: SignedIn;
}

export const load = async ({
	data,
	parent
}: {
	readonly data: { readonly programs: readonly ProgramCardView[] };
	readonly parent: () => Promise<LayoutData>;
}): Promise<ProgramList | SignedOut> => {
	const { signedIn } = await parent();
	if (signedIn === undefined) return SIGNED_OUT;
	return {
		...data,
		accounts: await otherBrowserAccounts(signedIn),
		sessions: await activeBrowserSessions(signedIn.account.id, data.programs),
		signedIn
	};
};
