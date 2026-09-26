import type { SessionItemView, SessionView } from '../application/session-views.ts';
import type {
	ActiveSession,
	Performed,
	Rejected,
	SessionMark,
	Store
} from '../application/store.ts';

import {
	ActiveSessionExistsError,
	doneExercisesOf,
	hasSessionItem,
	HISTORY_DAYS,
	isSessionItemMarked,
	MarkedSessionItemError,
	NoActiveSessionError,
	NoSessionItemError
} from '../application/store.ts';
import { activeSessionOf, performedOf } from './session-records.ts';

const ACTIVE_SESSION_KEY = 'training:active-session:';
const DATABASE_NAME = 'training';
const DATABASE_VERSION = 1;
const HISTORY_STORE = 'history';
const HISTORY_ABORTED = 'Обращение к Истории прервано';
const READ_ONLY = 'readonly';
const READ_WRITE = 'readwrite';
const UPGRADE_EVENT = 'upgradeneeded';
const SUCCESS_EVENT = 'success';
const ERROR_EVENT = 'error';
const VERSION_CHANGE_EVENT = 'versionchange';
const COMPLETE_EVENT = 'complete';
const ABORT_EVENT = 'abort';
const DAY_MS = 86_400_000;
const FIRST_DRAW = 1;
const NOTHING_REJECTED: Rejected = { exercises: [], targets: [] };

export interface BrowserStoreDeps {
	readonly indexedDB: IDBFactory | undefined;
	readonly now: () => Date;
	readonly storage: Storage;
}

export const createBrowserStore = (deps: BrowserStoreDeps): Store => {
	let database: Promise<IDBDatabase | null> | undefined;
	const historyDatabase = (): Promise<IDBDatabase | null> =>
		(database ??= openDatabase(deps.indexedDB));
	const withHistory = async <Value>(
		work: (opened: IDBDatabase) => Promise<Value>
	): Promise<undefined | Value> => {
		const opened = await historyDatabase();
		if (opened === null) return;
		try {
			return await work(opened);
		} catch {
			database = Promise.resolve(null);
			return;
		}
	};
	const daysBack = (days: number): number => deps.now().getTime() - days * DAY_MS;
	const readActive = (account: string): ActiveSession | undefined =>
		activeSessionOf(deps.storage.getItem(activeSessionKey(account)));
	const writeActive = (session: ActiveSession): ActiveSession => {
		deps.storage.setItem(activeSessionKey(session.account), JSON.stringify(session));
		return session;
	};
	const openSession = (account: string, view: SessionView): ActiveSession => {
		if (readActive(account) !== undefined) throw new ActiveSessionExistsError(account);
		const openedAt = deps.now().toISOString();
		return writeActive({
			account,
			markedAt: openedAt,
			marks: [],
			openedAt,
			rejected: NOTHING_REJECTED,
			view
		});
	};
	const markExercise = (account: string, mark: SessionMark): ActiveSession => {
		const session = readActive(account);
		if (session === undefined) throw new NoActiveSessionError(account);
		if (!hasSessionItem(session, mark.ord)) throw new NoSessionItemError(mark.ord);
		return writeActive({
			...session,
			markedAt: deps.now().toISOString(),
			marks: [...session.marks.filter((kept) => kept.ord !== mark.ord), mark].toSorted(
				(first, second) => first.ord - second.ord
			)
		});
	};
	const redrawItem = (
		account: string,
		item: SessionItemView,
		rejected: Rejected
	): ActiveSession => {
		const session = readActive(account);
		if (session === undefined) throw new NoActiveSessionError(account);
		if (!hasSessionItem(session, item.ord)) throw new NoSessionItemError(item.ord);
		if (isSessionItemMarked(session, item.ord)) throw new MarkedSessionItemError(item.ord);
		return writeActive({
			...session,
			rejected: {
				exercises: [...new Set([...session.rejected.exercises, ...rejected.exercises])],
				targets: [...new Set([...session.rejected.targets, ...rejected.targets])]
			},
			view: withRedrawn(session.view, (drawn) =>
				drawn.ord === item.ord ? { ...item, drawNo: drawn.drawNo + 1 } : drawn
			)
		});
	};
	const redrawSession = (account: string, view: SessionView): ActiveSession => {
		const session = readActive(account);
		if (session === undefined) throw new NoActiveSessionError(account);
		const [marked] = session.marks;
		if (marked !== undefined) throw new MarkedSessionItemError(marked.ord);
		const draws = new Map(
			session.view.blocks.flatMap((block) =>
				block.items.map((item) => [item.ord, item.drawNo])
			)
		);
		return writeActive({
			...session,
			rejected: NOTHING_REJECTED,
			view: withRedrawn(view, (item) => ({
				...item,
				drawNo: (draws.get(item.ord) ?? 0) + FIRST_DRAW
			}))
		});
	};
	const closeSession = async (account: string): Promise<void> => {
		const session = readActive(account);
		if (session === undefined) return;
		deps.storage.removeItem(activeSessionKey(account));
		const performed = doneExercisesOf(session).map((exercise) => ({
			doneAt: session.markedAt,
			exercise
		}));
		await withHistory((opened) =>
			appendPerformed(opened, account, performed, daysBack(HISTORY_DAYS))
		);
	};
	const recentExercises = async (
		account: string,
		days: number
	): Promise<readonly Performed[]> => {
		const performed = await withHistory((opened) => readPerformed(opened, account));
		return performedSince(performed ?? [], daysBack(days));
	};
	const activeSessions = (): readonly ActiveSession[] =>
		storedKeysOf(deps.storage)
			.filter((key) => key.startsWith(ACTIVE_SESSION_KEY))
			.map((key) => activeSessionOf(deps.storage.getItem(key)))
			.filter((session) => session !== undefined);
	return {
		activeSession: (account) => Promise.try(() => readActive(account)),
		activeSessions: () => Promise.try(activeSessions),
		closeSession,
		isHistoryAvailable: async () => (await historyDatabase()) !== null,
		markExercise: (account, mark) => Promise.try(() => markExercise(account, mark)),
		openSession: (account, view) => Promise.try(() => openSession(account, view)),
		recentExercises,
		redrawItem: (account, item, rejected) =>
			Promise.try(() => redrawItem(account, item, rejected)),
		redrawSession: (account, view) => Promise.try(() => redrawSession(account, view))
	};
};

const activeSessionKey = (account: string): string => ACTIVE_SESSION_KEY + account;

const appendPerformed = async (
	database: IDBDatabase,
	account: string,
	performed: readonly Performed[],
	keptSince: number
): Promise<void> => {
	const transaction = database.transaction(HISTORY_STORE, READ_WRITE);
	const history = transaction.objectStore(HISTORY_STORE);
	const request = history.get(account);
	request.addEventListener(SUCCESS_EVENT, () => {
		const kept = performedSince(performedOf(request.result), keptSince);
		history.put([...kept, ...performed], account);
	});
	await settled(transaction);
};

const closingOnVersionChange = (database: IDBDatabase): IDBDatabase => {
	database.addEventListener(VERSION_CHANGE_EVENT, () => {
		database.close();
	});
	return database;
};

const openDatabase = async (factory: IDBFactory | undefined): Promise<IDBDatabase | null> => {
	if (factory === undefined) return null;
	try {
		return await openRequest(factory);
	} catch {
		return null;
	}
};

const openRequest = (factory: IDBFactory): Promise<IDBDatabase | null> =>
	new Promise((resolve) => {
		const request = factory.open(DATABASE_NAME, DATABASE_VERSION);
		request.addEventListener(UPGRADE_EVENT, () => {
			request.result.createObjectStore(HISTORY_STORE);
		});
		const finish = (): void => {
			resolve(request.error === null ? closingOnVersionChange(request.result) : null);
		};
		request.addEventListener(SUCCESS_EVENT, finish);
		request.addEventListener(ERROR_EVENT, finish);
	});

const performedSince = (performed: readonly Performed[], since: number): readonly Performed[] =>
	performed.filter((entry) => Date.parse(entry.doneAt) >= since);

const readPerformed = async (
	database: IDBDatabase,
	account: string
): Promise<readonly Performed[]> => {
	const transaction = database.transaction(HISTORY_STORE, READ_ONLY);
	const request = transaction.objectStore(HISTORY_STORE).get(account);
	await settled(transaction);
	return performedOf(request.result);
};

const storedKeysOf = (storage: Storage): readonly string[] =>
	Array.from({ length: storage.length }, (_, index) => storage.key(index)).filter(
		(key) => key !== null
	);

const settled = (transaction: IDBTransaction): Promise<void> =>
	new Promise((resolve, reject) => {
		transaction.addEventListener(COMPLETE_EVENT, () => {
			resolve();
		});
		transaction.addEventListener(ABORT_EVENT, () => {
			reject(new Error(HISTORY_ABORTED));
		});
	});

const withRedrawn = (
	view: SessionView,
	redraw: (item: SessionItemView) => SessionItemView
): SessionView => ({
	...view,
	blocks: view.blocks.map((block) => ({
		...block,
		items: block.items.map((item) => redraw(item))
	}))
});
