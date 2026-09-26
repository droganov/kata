import type { ProgramCardView } from '../application/session-views.ts';
import type { ActiveSession, SessionMark, Store } from '../application/store.ts';
import type { Fetch } from '../infrastructure/session-endpoint.ts';

import { startSession } from '../application/start-session.ts';
import { createBrowserStore } from '../infrastructure/browser-store.ts';
import { fetchSessionView } from '../infrastructure/session-endpoint.ts';

export type { ActiveSession, SessionMark } from '../application/store.ts';
export type { Fetch } from '../infrastructure/session-endpoint.ts';

const HISTORY_WARNING_KEY = 'training:history-warning';
const HISTORY_WARNING_SHOWN = 'shown';
const UNDEFINED_KIND = 'undefined';

export interface BrowserSession {
	readonly isHistoryWarningDue: boolean;
	readonly session: ActiveSession;
}

export const startBrowserSession = async (
	program: ProgramCardView,
	fetcher: Fetch
): Promise<BrowserSession> => {
	const started = await startSession(browserStore(), program, () =>
		fetchSessionView(fetcher, program.id)
	);
	const isHistoryWarningDue =
		!started.isHistoryAvailable && sessionStorage.getItem(HISTORY_WARNING_KEY) === null;
	if (isHistoryWarningDue) sessionStorage.setItem(HISTORY_WARNING_KEY, HISTORY_WARNING_SHOWN);
	return { isHistoryWarningDue, session: started.session };
};

export const markBrowserSession = (account: string, mark: SessionMark): Promise<ActiveSession> =>
	browserStore().markExercise(account, mark);

const browserStore = (): Store =>
	createBrowserStore({
		indexedDB: indexedDbOf(),
		now: () => new Date(),
		storage: sessionStorage
	});

const indexedDbOf = (): IDBFactory | undefined =>
	typeof indexedDB === UNDEFINED_KIND ? undefined : indexedDB;
