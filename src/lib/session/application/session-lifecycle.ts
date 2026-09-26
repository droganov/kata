import type { ActiveSession, SessionMark, Store } from './store.ts';

const EXPIRY_MS = 7_200_000;

export interface MarkedSession {
	readonly isFinalized: boolean;
	readonly session: ActiveSession;
}

export const closeExpiredSessions = async (store: Store, now: Date): Promise<readonly string[]> => {
	const active = await store.activeSessions();
	const expired = active
		.filter((session) => isExpired(session, now))
		.map((session) => session.account);
	for (const account of expired) await store.closeSession(account);
	return expired;
};

export const markSessionItem = async (
	store: Store,
	account: string,
	mark: SessionMark
): Promise<MarkedSession> => {
	const session = await store.markExercise(account, mark);
	const isFinalized = isEveryItemMarked(session);
	if (isFinalized) await store.closeSession(account);
	return { isFinalized, session };
};

const isExpired = (session: ActiveSession, now: Date): boolean =>
	now.getTime() - Date.parse(session.markedAt) >= EXPIRY_MS;

const isEveryItemMarked = (session: ActiveSession): boolean => {
	const marked = new Set(session.marks.map((mark) => mark.ord));
	return session.view.blocks.every((block) => block.items.every((item) => marked.has(item.ord)));
};
