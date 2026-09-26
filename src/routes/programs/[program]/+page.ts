import { redirect } from '@sveltejs/kit';

import type { ProgramCardView } from '../../../lib/session/application/session-views.ts';
import type { BrowserSession, Fetch } from '../../../lib/session/interface/browser-session.ts';

import { startBrowserSession } from '../../../lib/session/interface/browser-session.ts';

const PROGRAMS_PATH = '/programs/';
const TEMPORARY_REDIRECT = 307;

export const load = async ({
	data,
	fetch
}: {
	readonly data: { readonly program: ProgramCardView };
	readonly fetch: Fetch;
}): Promise<BrowserSession> => {
	const started = await startBrowserSession(data.program, fetch);
	if (started.session.view.program !== data.program.id)
		redirect(TEMPORARY_REDIRECT, PROGRAMS_PATH + started.session.view.program);
	return started;
};
