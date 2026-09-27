import type { RedrawnSession } from '../application/redraw-session.ts';
import type { MarkedSession } from '../application/session-lifecycle.ts';
import type { ProgramCardView } from '../application/session-views.ts';
import type { ActiveSession, SessionMark, Store } from '../application/store.ts';
import type { Delivery } from '../application/unsent-marks.ts';
import type { RedrawLevel } from '../domain/redraw.ts';
import type { Fetch } from '../infrastructure/session-endpoint.ts';

import {
	activeSessionsOf,
	redrawActiveSession,
	redrawSessionItem
} from '../application/redraw-session.ts';
import { closeExpiredSessions, markSessionItem } from '../application/session-lifecycle.ts';
import { startSession } from '../application/start-session.ts';
import { sendMarks } from '../application/unsent-marks.ts';
import { createBrowserStore } from '../infrastructure/browser-store.ts';
import {
	fetchRedrawnItem,
	fetchSessionView,
	hasDeliveredMarks
} from '../infrastructure/session-endpoint.ts';
import { createStoredUnsentMarks } from '../infrastructure/stored-unsent-marks.ts';

export { isSessionRedrawable } from '../application/redraw-session.ts';
export type { SessionMark } from '../application/store.ts';
export type { Delivery } from '../application/unsent-marks.ts';
export { REDRAW_LEVEL } from '../domain/redraw.ts';
export type { RedrawLevel } from '../domain/redraw.ts';
export type { Fetch } from '../infrastructure/session-endpoint.ts';

export const SESSION_DEPENDENCY = 'training:session';

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
	account: string,
	program: ProgramCardView,
	fetcher: Fetch
): Promise<BrowserSession> => {
	const started = await startSession(browserStore(), account, (history) =>
		fetchSessionView(fetcher, program.id, history)
	);
	const isHistoryWarningDue =
		!started.isHistoryAvailable && sessionStorage.getItem(HISTORY_WARNING_KEY) === null;
	if (isHistoryWarningDue) sessionStorage.setItem(HISTORY_WARNING_KEY, HISTORY_WARNING_SHOWN);
	return { isHistoryWarningDue, session: started.session };
};

export const markBrowserSession = (account: string, mark: SessionMark): Promise<MarkedSession> =>
	markSessionItem(browserStore(), createStoredUnsentMarks(sessionStorage), account, mark);

export const sendBrowserMarks = (account: string, fetcher: Fetch): Promise<Delivery> =>
	sendMarks(createStoredUnsentMarks(sessionStorage), account, (marks) =>
		hasDeliveredMarks(fetcher, marks)
	);

export const redrawBrowserSessionItem = (
	session: ActiveSession,
	level: RedrawLevel,
	ord: number,
	fetcher: Fetch
): Promise<RedrawnSession> =>
	redrawSessionItem(browserStore(), session.account, level, ord, (history, redraw) =>
		fetchRedrawnItem(fetcher, session.view.program, history, redraw)
	);

export const redrawBrowserSession = (
	session: ActiveSession,
	fetcher: Fetch
): Promise<ActiveSession> =>
	redrawActiveSession(browserStore(), session.account, (history) =>
		fetchSessionView(fetcher, session.view.program, history)
	);

export const activeBrowserSessions = (
	account: string,
	programs: readonly ProgramCardView[]
): Promise<readonly ActiveSession[]> => activeSessionsOf(browserStore(), account, programs);

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
