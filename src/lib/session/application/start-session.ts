import type { ProgramCardView, SessionView } from './session-views.ts';
import type { ActiveSession, Performed, Store } from './store.ts';

import { HISTORY_DAYS } from './store.ts';

export interface StartedSession {
	readonly isHistoryAvailable: boolean;
	readonly session: ActiveSession;
}

export const startSession = async (
	store: Store,
	program: ProgramCardView,
	assemble: (history: readonly Performed[]) => Promise<SessionView>
): Promise<StartedSession> => {
	const session =
		(await store.activeSession(program.account)) ??
		(await openAssembled(store, program, assemble));
	return { isHistoryAvailable: await store.isHistoryAvailable(), session };
};

const openAssembled = async (
	store: Store,
	program: ProgramCardView,
	assemble: (history: readonly Performed[]) => Promise<SessionView>
): Promise<ActiveSession> => {
	const history = await store.recentExercises(program.account, HISTORY_DAYS);
	return store.openSession(program.account, await assemble(history));
};
