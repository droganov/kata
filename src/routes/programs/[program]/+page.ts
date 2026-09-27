import { redirect } from '@sveltejs/kit';

import type { LayoutData } from '../../+layout.ts';
import type { SignedIn, SignedOut } from '../../../lib/account/interface/browser-account.ts';
import type { ProgramCardView } from '../../../lib/session/application/session-views.ts';
import type { Fetch } from '../../../lib/session/interface/browser-session.ts';
import type { SessionScreen } from '../../../lib/session/interface/session-screen.ts';

import { SIGNED_OUT } from '../../../lib/account/interface/browser-account.ts';
import {
	SESSION_DEPENDENCY,
	startBrowserSession
} from '../../../lib/session/interface/browser-session.ts';
import { sessionScreenOf } from '../../../lib/session/interface/session-screen.ts';

export interface SessionPage extends SessionScreen {
	readonly signedIn: SignedIn;
}

const PROGRAMS_PATH = '/programs/';
const TEMPORARY_REDIRECT = 307;

export const load = async ({
	data,
	depends,
	fetch,
	parent,
	url
}: {
	readonly data: { readonly program: ProgramCardView };
	readonly depends: (...dependencies: `${string}:${string}`[]) => void;
	readonly fetch: Fetch;
	readonly parent: () => Promise<LayoutData>;
	readonly url: URL;
}): Promise<SessionPage | SignedOut> => {
	depends(SESSION_DEPENDENCY);
	const { signedIn } = await parent();
	if (signedIn === undefined) return SIGNED_OUT;
	const started = await startBrowserSession(signedIn.account.id, data.program, fetch);
	if (started.session.view.program !== data.program.id)
		redirect(TEMPORARY_REDIRECT, PROGRAMS_PATH + started.session.view.program);
	return { ...sessionScreenOf(started, url.searchParams), signedIn };
};
