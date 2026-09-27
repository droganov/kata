export interface AuthSession {
	readonly account: string;
	readonly createdAt: string;
	readonly deviceLabel: string;
	readonly id: string;
	readonly key: string;
	readonly lastSeenAt: string;
	readonly revokedAt: null | string;
}

export const isLive = (session: AuthSession): boolean => session.revokedAt === null;

export const newestFirst = (sessions: readonly AuthSession[]): readonly AuthSession[] =>
	sessions.toSorted((first, second) => second.createdAt.localeCompare(first.createdAt));
