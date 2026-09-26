import type { Redraw, RedrawLevel, SessionItemRef } from '../domain/redraw.ts';
import type { ProgramCardView, Redrawn, SessionView } from './session-views.ts';
import type { ActiveSession, Performed, Store } from './store.ts';

import { HISTORY_DAYS, NoActiveSessionError, NoSessionItemError } from './store.ts';

export interface RedrawnSession {
	readonly isRedrawn: boolean;
	readonly session: ActiveSession;
}

export const redrawSessionItem = async (
	store: Store,
	account: string,
	level: RedrawLevel,
	ord: number,
	redrawn: (history: readonly Performed[], redraw: Redraw) => Promise<Redrawn | undefined>
): Promise<RedrawnSession> => {
	const session = await store.activeSession(account);
	if (session === undefined) throw new NoActiveSessionError(account);
	const items = sessionItemRefsOf(session.view);
	if (items.every((candidate) => candidate.ord !== ord)) throw new NoSessionItemError(ord);
	const history = await store.recentExercises(account, HISTORY_DAYS);
	const replacement = await redrawn(history, { items, level, ord, rejected: session.rejected });
	if (replacement === undefined) return { isRedrawn: false, session };
	return { isRedrawn: true, session: await store.redrawItem(account, replacement) };
};

export const redrawActiveSession = async (
	store: Store,
	account: string,
	assemble: (history: readonly Performed[]) => Promise<SessionView>
): Promise<ActiveSession> => {
	const history = await store.recentExercises(account, HISTORY_DAYS);
	return store.redrawSession(account, await assemble(history));
};

export const isSessionRedrawable = (session: ActiveSession): boolean => session.marks.length === 0;

export const activeSessionsOf = async (
	store: Store,
	programs: readonly ProgramCardView[]
): Promise<readonly ActiveSession[]> => {
	const active = await store.activeSessions();
	return active.filter((session) =>
		programs.some(
			(program) => program.account === session.account && program.id === session.view.program
		)
	);
};

const sessionItemRefsOf = (view: SessionView): readonly SessionItemRef[] =>
	view.blocks.flatMap((block) =>
		block.items.map((item) => ({
			block: block.id,
			exercise: item.exercise,
			ord: item.ord,
			target: item.target
		}))
	);
