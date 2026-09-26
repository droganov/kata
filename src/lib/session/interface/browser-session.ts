import type { MarkedSession } from '../application/session-lifecycle.ts';
import type { ProgramCardView } from '../application/session-views.ts';
import type { ActiveSession, SessionMark, Store } from '../application/store.ts';
import type { Fetch } from '../infrastructure/session-endpoint.ts';

import { closeExpiredSessions, markSessionItem } from '../application/session-lifecycle.ts';
import { startSession } from '../application/start-session.ts';
import { createBrowserStore } from '../infrastructure/browser-store.ts';
import { fetchSessionView } from '../infrastructure/session-endpoint.ts';

export type { SessionMark } from '../application/store.ts';
export type { Fetch } from '../infrastructure/session-endpoint.ts';

const HISTORY_WARNING_KEY = 'training:history-warning';
const HISTORY_WARNING_SHOWN = 'shown';
const UNDEFINED_KIND = 'undefined';

export interface BrowserSession {
	readonly isHistoryWarningDue: boolean;
	readonly session: ActiveSession;
}

export const closeExpiredBrowserSessions = (): Promise<readonly string[]> =>
	closeExpiredSessions(browserStore(), new Date());

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

export const markBrowserSession = (account: string, mark: SessionMark): Promise<MarkedSession> =>
	markSessionItem(browserStore(), account, mark);

export const cancelBrowserSession = (account: string): Promise<void> =>
	browserStore().closeSession(account);

const browserStore = (): Store =>
	createBrowserStore({
		indexedDB: indexedDbOf(),
		now: () => new Date(),
		storage: sessionStorage
	});

const indexedDbOf = (): IDBFactory | undefined =>
	typeof indexedDB === UNDEFINED_KIND ? undefined : indexedDB;
