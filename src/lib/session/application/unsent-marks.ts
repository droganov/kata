import type { ActiveSession, SessionMark } from './store.ts';

export interface Delivery {
	readonly isReachable: boolean;
	readonly unsent: number;
}

export interface UnsentMark {
	readonly exercise: string;
	readonly markedAt: string;
	readonly ord: number;
	readonly program: string;
	readonly seed: number;
	readonly status: SessionMark['status'];
}

export interface UnsentMarks {
	readonly keep: (account: string, mark: UnsentMark) => void;
	readonly sent: (account: string, marks: readonly UnsentMark[]) => void;
	readonly unsent: (account: string) => readonly UnsentMark[];
}

export const sendMarks = async (
	marks: UnsentMarks,
	account: string,
	hasDelivered: (unsent: readonly UnsentMark[]) => Promise<boolean>
): Promise<Delivery> => {
	const unsent = marks.unsent(account);
	const isReachable = await hasDelivered(unsent);
	if (isReachable) marks.sent(account, unsent);
	return { isReachable, unsent: marks.unsent(account).length };
};

export const unsentMarkOf = (session: ActiveSession, mark: SessionMark): UnsentMark => ({
	exercise:
		session.view.blocks.flatMap((block) => block.items).find((item) => item.ord === mark.ord)
			?.exercise ?? '',
	markedAt: session.markedAt,
	ord: mark.ord,
	program: session.view.program,
	seed: session.view.seed,
	status: mark.status
});

export const isSameSessionItem = (first: UnsentMark, second: UnsentMark): boolean =>
	first.seed === second.seed && first.program === second.program && first.ord === second.ord;

export const isSameMark = (first: UnsentMark, second: UnsentMark): boolean =>
	isSameSessionItem(first, second) &&
	first.status === second.status &&
	first.markedAt === second.markedAt;
