import type { ProgramCardView, SessionView } from './session-views.ts';
import type { Store } from './store.ts';

export interface StartedSession {
	readonly isHistoryAvailable: boolean;
	readonly view: SessionView;
}

export const startSession = async (
	store: Store,
	program: ProgramCardView,
	assemble: () => Promise<SessionView>
): Promise<StartedSession> => {
	const active = await store.activeSession(program.account);
	const session = active ?? (await store.openSession(program.account, await assemble()));
	return { isHistoryAvailable: await store.isHistoryAvailable(), view: session.view };
};
