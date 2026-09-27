import type { SessionView } from './session-views.ts';
import type { ActiveSession, Performed, Store } from './store.ts';

import { HISTORY_DAYS } from './store.ts';

export interface StartedSession {
	readonly isHistoryAvailable: boolean;
	readonly session: ActiveSession;
}

export const startSession = async (
	store: Store,
	account: string,
	assemble: (history: readonly Performed[]) => Promise<SessionView>
): Promise<StartedSession> => {
	const session =
		(await store.activeSession(account)) ?? (await openAssembled(store, account, assemble));
	return { isHistoryAvailable: await store.isHistoryAvailable(), session };
};

const openAssembled = async (
	store: Store,
	account: string,
	assemble: (history: readonly Performed[]) => Promise<SessionView>
): Promise<ActiveSession> => {
	const history = await store.recentExercises(account, HISTORY_DAYS);
	return store.openSession(account, await assemble(history));
};
