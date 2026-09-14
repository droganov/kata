import type { ProgramCardView, SessionView } from '../application/session-views.ts';
import type { Fetch } from '../infrastructure/session-endpoint.ts';

import { startSession } from '../application/start-session.ts';
import { createBrowserStore } from '../infrastructure/browser-store.ts';
import { fetchSessionView } from '../infrastructure/session-endpoint.ts';

export type { Fetch } from '../infrastructure/session-endpoint.ts';

const HISTORY_WARNING_KEY = 'training:history-warning';
const HISTORY_WARNING_SHOWN = 'shown';
const UNDEFINED_KIND = 'undefined';

export interface BrowserSession {
	readonly isHistoryWarningDue: boolean;
	readonly view: SessionView;
}

export const startBrowserSession = async (
	program: ProgramCardView,
	fetcher: Fetch
): Promise<BrowserSession> => {
	const started = await startSession(
		createBrowserStore({
			indexedDB: indexedDbOf(),
			now: () => new Date(),
			storage: sessionStorage
		}),
		program,
		() => fetchSessionView(fetcher, program.id)
	);
	const isHistoryWarningDue =
		!started.isHistoryAvailable && sessionStorage.getItem(HISTORY_WARNING_KEY) === null;
	if (isHistoryWarningDue) sessionStorage.setItem(HISTORY_WARNING_KEY, HISTORY_WARNING_SHOWN);
	return { isHistoryWarningDue, view: started.view };
};

const indexedDbOf = (): IDBFactory | undefined =>
	typeof indexedDB === UNDEFINED_KIND ? undefined : indexedDB;
