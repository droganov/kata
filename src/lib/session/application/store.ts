import type { Performed } from '../domain/novelty.ts';
import type { Rejected } from '../domain/redraw.ts';
import type { SessionItemView, SessionView } from './session-views.ts';

export { HISTORY_DAYS } from '../domain/novelty.ts';
export type { Performed } from '../domain/novelty.ts';
export type { Rejected } from '../domain/redraw.ts';

const ACTIVE_SESSION_EXISTS = 'Активное занятие у Аккаунта уже есть: ';
const ACTIVE_SESSION_EXISTS_NAME = 'ActiveSessionExistsError';
const NO_ACTIVE_SESSION = 'Активного занятия у Аккаунта нет: ';
const NO_ACTIVE_SESSION_NAME = 'NoActiveSessionError';
const NO_SESSION_ITEM = 'Позиции нет в Активном занятии: ';
const NO_SESSION_ITEM_NAME = 'NoSessionItemError';
const MARKED_SESSION_ITEM = 'Позиция уже отмечена, её не пересобрать: ';
const MARKED_SESSION_ITEM_NAME = 'MarkedSessionItemError';

export const MARK_STATUS = { done: 'done', skipped: 'skipped' } as const;

export interface ActiveSession {
	readonly account: string;
	readonly markedAt: string;
	readonly marks: readonly SessionMark[];
	readonly openedAt: string;
	readonly rejected: Rejected;
	readonly view: SessionView;
}

export interface SessionMark {
	readonly ord: number;
	readonly status: MarkStatus;
}

export interface Store {
	activeSession: (account: string) => Promise<ActiveSession | undefined>;
	activeSessions: () => Promise<readonly ActiveSession[]>;
	closeSession: (account: string) => Promise<void>;
	isHistoryAvailable: () => Promise<boolean>;
	markExercise: (account: string, mark: SessionMark) => Promise<ActiveSession>;
	openSession: (account: string, view: SessionView) => Promise<ActiveSession>;
	recentExercises: (account: string, days: number) => Promise<readonly Performed[]>;
	redrawItem: (
		account: string,
		item: SessionItemView,
		rejected: Rejected
	) => Promise<ActiveSession>;
	redrawSession: (account: string, view: SessionView) => Promise<ActiveSession>;
}

type MarkStatus = (typeof MARK_STATUS)[keyof typeof MARK_STATUS];

export class ActiveSessionExistsError extends Error {
	override readonly name = ACTIVE_SESSION_EXISTS_NAME;

	constructor(account: string) {
		super(ACTIVE_SESSION_EXISTS + account);
	}
}

export class MarkedSessionItemError extends Error {
	override readonly name = MARKED_SESSION_ITEM_NAME;

	constructor(ord: number) {
		super(MARKED_SESSION_ITEM + String(ord));
	}
}

export class NoActiveSessionError extends Error {
	override readonly name = NO_ACTIVE_SESSION_NAME;

	constructor(account: string) {
		super(NO_ACTIVE_SESSION + account);
	}
}

export class NoSessionItemError extends Error {
	override readonly name = NO_SESSION_ITEM_NAME;

	constructor(ord: number) {
		super(NO_SESSION_ITEM + String(ord));
	}
}

export const doneExercisesOf = (session: ActiveSession): readonly string[] => {
	const done = new Set(
		session.marks.filter((mark) => mark.status === MARK_STATUS.done).map((mark) => mark.ord)
	);
	return session.view.blocks
		.flatMap((block) => block.items)
		.filter((item) => done.has(item.ord))
		.map((item) => item.exercise);
};

export const hasSessionItem = (session: ActiveSession, ord: number): boolean =>
	session.view.blocks.some((block) => block.items.some((item) => item.ord === ord));

export const isSessionItemMarked = (session: ActiveSession, ord: number): boolean =>
	session.marks.some((mark) => mark.ord === ord);
