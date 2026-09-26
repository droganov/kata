import { redirect } from '@sveltejs/kit';

import type { ProgramCardView } from '../../../lib/session/application/session-views.ts';
import type { Fetch } from '../../../lib/session/interface/browser-session.ts';
import type { SessionScreen } from '../../../lib/session/interface/session-screen.ts';

import { startBrowserSession } from '../../../lib/session/interface/browser-session.ts';
import { sessionScreenOf } from '../../../lib/session/interface/session-screen.ts';

const PROGRAMS_PATH = '/programs/';
const TEMPORARY_REDIRECT = 307;

export const load = async ({
	data,
	fetch,
	parent,
	url
}: {
	readonly data: { readonly program: ProgramCardView };
	readonly fetch: Fetch;
	readonly parent: () => Promise<unknown>;
	readonly url: URL;
}): Promise<SessionScreen> => {
	await parent();
	const started = await startBrowserSession(data.program, fetch);
	if (started.session.view.program !== data.program.id)
		redirect(TEMPORARY_REDIRECT, PROGRAMS_PATH + started.session.view.program);
	return sessionScreenOf(started, url.searchParams);
};
