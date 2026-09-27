import type {
	AccountStore,
	AuthSession,
	Credential,
	DeviceAccount,
	NewCredential,
	Person
} from '../application/account-store.ts';
import type { EmailCode } from '../domain/email-code.ts';

import { hexOf, uuidV7Of } from '../../shared/uuid.ts';
import {
	AccountsUnavailableError,
	EmailTakenError,
	UnknownAccountError,
	UnknownKeyError
} from '../application/account-store.ts';
import { isLive, newestFirst } from '../domain/auth-session.ts';
import { lastSignedInFirst } from '../domain/device-account.ts';
import { expiryOf, isCodeUsable } from '../domain/email-code.ts';
import { HANDLE_BYTES } from '../domain/person.ts';
import {
	isAuthSession,
	isCredential,
	isDeviceAccount,
	isEmailCode,
	isPerson
} from './account-records.ts';

const DATABASE_NAME = 'training-account';
const DATABASE_VERSION = 2;
const EMPTY_VERSION = 0;
const PERSON = 'person';
const EMAIL_CODE = 'email_code';
const CREDENTIAL = 'credential';
const AUTH_SESSION = 'auth_session';
const DEVICE_ACCOUNT = 'device_account';
const ID_KEY = 'id';
const ACCOUNT_KEY = 'account';
const EMAIL_INDEX = 'email';
const ACCOUNT_INDEX = 'account';
const READ_ONLY = 'readonly';
const READ_WRITE = 'readwrite';
const UPGRADE_EVENT = 'upgradeneeded';
const SUCCESS_EVENT = 'success';
const ERROR_EVENT = 'error';
const VERSION_CHANGE_EVENT = 'versionchange';
const COMPLETE_EVENT = 'complete';
const ABORT_EVENT = 'abort';
const ID_RANDOM_BYTES = 10;
const CODE_DIGITS = 6;
const DECIMAL = 10;
const HASH = 'SHA-256';

export interface AccountStoreDeps {
	readonly indexedDB: IDBFactory | undefined;
	readonly now: () => Date;
	readonly randomBytes: (length: number) => Uint8Array;
}

type Outcome<Value> = () => Value;

type Table =
	| typeof AUTH_SESSION
	| typeof CREDENTIAL
	| typeof DEVICE_ACCOUNT
	| typeof EMAIL_CODE
	| typeof PERSON;

type Work<Value> = (transaction: IDBTransaction) => Outcome<Value>;

export const createIdbAccountStore = (deps: AccountStoreDeps): AccountStore => {
	let database: Promise<IDBDatabase> | undefined;
	const run = async <Value>(
		tables: readonly Table[],
		mode: IDBTransactionMode,
		work: Work<Value>
	): Promise<Value> => {
		database ??= openDatabase(deps.indexedDB);
		return transact(await database, tables, mode, work);
	};
	const readOne = async <Row>(
		table: Table,
		isRow: (value: unknown) => value is Row,
		query: (records: IDBObjectStore) => IDBRequest
	): Promise<Row | undefined> => {
		const [row] = await run([table], READ_ONLY, readRows(table, isRow, query));
		return row;
	};
	const moment = (): string => deps.now().toISOString();
	const newId = (): string => uuidV7Of(deps.now().getTime(), deps.randomBytes(ID_RANDOM_BYTES));
	const registerAccount = async (nickname: string, email: string): Promise<Person> => {
		const person: Person = {
			createdAt: moment(),
			email,
			emailVerifiedAt: null,
			handle: hexOf(deps.randomBytes(HANDLE_BYTES)),
			id: newId(),
			nickname
		};
		if (await run([PERSON], READ_WRITE, addUnlessEmailTaken(person)))
			throw new EmailTakenError(email);
		return person;
	};
	const issueEmailCode = async (account: string): Promise<void> => {
		const code: EmailCode = {
			account,
			codeHash: await hashOf(codeOf(deps.randomBytes(CODE_DIGITS))),
			expiresAt: expiryOf(deps.now()),
			id: newId(),
			usedAt: null
		};
		if (!(await run([PERSON, EMAIL_CODE], READ_WRITE, addForAccount(EMAIL_CODE, code))))
			throw new UnknownAccountError(account);
	};
	const attachKey = async (account: string, key: NewCredential): Promise<Credential> => {
		const credential: Credential = {
			...key,
			account,
			createdAt: moment(),
			id: newId(),
			lastUsedAt: null
		};
		if (!(await run([PERSON, CREDENTIAL], READ_WRITE, addForAccount(CREDENTIAL, credential))))
			throw new UnknownAccountError(account);
		return credential;
	};
	const signIn = async (account: string, key: string, device: string): Promise<AuthSession> => {
		const now = moment();
		const session: AuthSession = {
			account,
			createdAt: now,
			deviceLabel: device,
			id: newId(),
			key,
			lastSeenAt: now,
			revokedAt: null
		};
		const tables = [PERSON, CREDENTIAL, AUTH_SESSION, DEVICE_ACCOUNT] as const;
		if (!(await run(tables, READ_WRITE, addWithOwnKey(session))))
			throw new UnknownKeyError(key);
		return session;
	};
	const sessionsOf = async (account: string): Promise<readonly AuthSession[]> => {
		const sessions = await run(
			[AUTH_SESSION],
			READ_ONLY,
			readRows(AUTH_SESSION, isAuthSession, byAccount(account))
		);
		return newestFirst(sessions.filter((session) => isLive(session)));
	};
	return {
		account: (account) => readOne(PERSON, isPerson, byId(account)),
		accountByEmail: (email) => readOne(PERSON, isPerson, byEmail(email)),
		attachKey,
		authSession: (session) => readOne(AUTH_SESSION, isAuthSession, byId(session)),
		confirmEmail: (account) =>
			run([PERSON, EMAIL_CODE], READ_WRITE, confirmUsableCode(account, deps.now())),
		forgetAccount: async (account) => {
			await run([DEVICE_ACCOUNT], READ_WRITE, deleteRow(DEVICE_ACCOUNT, account));
		},
		issueEmailCode,
		keysOf: (account) =>
			run([CREDENTIAL], READ_ONLY, readRows(CREDENTIAL, isCredential, byAccount(account))),
		knownAccounts: async () =>
			lastSignedInFirst(
				await run(
					[DEVICE_ACCOUNT],
					READ_ONLY,
					readRows(DEVICE_ACCOUNT, isDeviceAccount, everyRow)
				)
			),
		registerAccount,
		revokeOtherSessions: async (account, keep) => {
			await run(
				[AUTH_SESSION],
				READ_WRITE,
				revokeWhere(byAccount(account), moment(), (session) => session.id !== keep)
			);
		},
		revokeSession: async (session) => {
			await run([AUTH_SESSION], READ_WRITE, revokeWhere(byId(session), moment(), isLive));
		},
		sessionsOf,
		signIn
	};
};

const byAccount =
	(account: string) =>
	(records: IDBObjectStore): IDBRequest =>
		records.index(ACCOUNT_INDEX).getAll(account);

const byEmail =
	(email: string) =>
	(records: IDBObjectStore): IDBRequest =>
		records.index(EMAIL_INDEX).get(email);

const byId =
	(id: string) =>
	(records: IDBObjectStore): IDBRequest =>
		records.get(id);

const everyRow = (records: IDBObjectStore): IDBRequest => records.getAll();

const deleteRow =
	(table: Table, id: string): Work<undefined> =>
	(transaction) => {
		const request = transaction.objectStore(table).delete(id);
		return () => request.result;
	};

const readRows =
	<Row>(
		table: Table,
		isRow: (value: unknown) => value is Row,
		query: (records: IDBObjectStore) => IDBRequest
	): Work<readonly Row[]> =>
	(transaction) => {
		const request = query(transaction.objectStore(table));
		return () => rowsIn(request, isRow);
	};

const addUnlessEmailTaken =
	(person: Person): Work<boolean> =>
	(transaction) => {
		const people = transaction.objectStore(PERSON);
		const found = people.index(EMAIL_INDEX).getKey(person.email);
		found.addEventListener(SUCCESS_EVENT, () => {
			if (found.result === undefined) people.add(person);
		});
		return () => found.result !== undefined;
	};

const addForAccount =
	(table: Table, row: Readonly<{ account: string }>): Work<boolean> =>
	(transaction) => {
		const found = transaction.objectStore(PERSON).getKey(row.account);
		found.addEventListener(SUCCESS_EVENT, () => {
			if (found.result !== undefined) transaction.objectStore(table).add(row);
		});
		return () => found.result !== undefined;
	};

const addWithOwnKey =
	(session: AuthSession): Work<boolean> =>
	(transaction) => {
		const keys = transaction.objectStore(CREDENTIAL);
		const found = keys.get(session.key);
		let isOwn = false;
		found.addEventListener(SUCCESS_EVENT, () => {
			const [credential] = rowsIn(found, isCredential);
			isOwn = credential?.account === session.account;
			if (!isOwn) return;
			keys.put({ ...credential, lastUsedAt: session.createdAt });
			transaction.objectStore(AUTH_SESSION).add(session);
			rememberOnDevice(transaction, session);
		});
		return () => isOwn;
	};

const rememberOnDevice = (transaction: IDBTransaction, session: AuthSession): void => {
	const found = transaction.objectStore(PERSON).get(session.account);
	found.addEventListener(SUCCESS_EVENT, () => {
		for (const person of rowsIn(found, isPerson)) {
			const known: DeviceAccount = {
				account: person.id,
				key: session.key,
				nickname: person.nickname,
				signedInAt: session.createdAt
			};
			transaction.objectStore(DEVICE_ACCOUNT).put(known);
		}
	});
};

const confirmUsableCode =
	(account: string, now: Date): Work<boolean> =>
	(transaction) => {
		let isConfirmed = false;
		const codes = byAccount(account)(transaction.objectStore(EMAIL_CODE));
		codes.addEventListener(SUCCESS_EVENT, () => {
			const usable = rowsIn(codes, isEmailCode).find((code) => isCodeUsable(code, now));
			if (usable === undefined) return;
			isConfirmed = true;
			transaction.objectStore(EMAIL_CODE).put({ ...usable, usedAt: now.toISOString() });
			markEmailVerified(transaction.objectStore(PERSON), account, now.toISOString());
		});
		return () => isConfirmed;
	};

const markEmailVerified = (people: IDBObjectStore, account: string, at: string): void => {
	const found = people.get(account);
	found.addEventListener(SUCCESS_EVENT, () => {
		for (const person of rowsIn(found, isPerson))
			people.put({ ...person, emailVerifiedAt: person.emailVerifiedAt ?? at });
	});
};

const revokeWhere =
	(
		query: (records: IDBObjectStore) => IDBRequest,
		at: string,
		isRevoked: (session: AuthSession) => boolean
	): Work<number> =>
	(transaction) => {
		const sessions = transaction.objectStore(AUTH_SESSION);
		const found = query(sessions);
		let revoked = 0;
		found.addEventListener(SUCCESS_EVENT, () => {
			for (const session of rowsIn(found, isAuthSession))
				if (isLive(session) && isRevoked(session)) {
					sessions.put({ ...session, revokedAt: at });
					revoked += 1;
				}
		});
		return () => revoked;
	};

const codeOf = (bytes: Uint8Array): string =>
	[...bytes].map((byte) => String(byte % DECIMAL)).join('');

const hashOf = async (text: string): Promise<string> => {
	const digest = await crypto.subtle.digest(HASH, new TextEncoder().encode(text));
	return hexOf(new Uint8Array(digest));
};

const openDatabase = async (factory: IDBFactory | undefined): Promise<IDBDatabase> => {
	if (factory === undefined) throw new AccountsUnavailableError();
	try {
		return await openRequest(factory);
	} catch {
		throw new AccountsUnavailableError();
	}
};

const openRequest = (factory: IDBFactory): Promise<IDBDatabase> =>
	new Promise((resolve, reject) => {
		const request = factory.open(DATABASE_NAME, DATABASE_VERSION);
		request.addEventListener(UPGRADE_EVENT, (event) => {
			createTables(request.result, event.oldVersion);
		});
		request.addEventListener(SUCCESS_EVENT, () => {
			resolve(closingOnVersionChange(request.result));
		});
		request.addEventListener(ERROR_EVENT, () => {
			reject(new AccountsUnavailableError());
		});
	});

const closingOnVersionChange = (database: IDBDatabase): IDBDatabase => {
	database.addEventListener(VERSION_CHANGE_EVENT, () => {
		database.close();
	});
	return database;
};

const createTables = (database: IDBDatabase, oldVersion: number): void => {
	if (oldVersion === EMPTY_VERSION) createAccountTables(database);
	database.createObjectStore(DEVICE_ACCOUNT, { keyPath: ACCOUNT_KEY });
};

const createAccountTables = (database: IDBDatabase): void => {
	database
		.createObjectStore(PERSON, { keyPath: ID_KEY })
		.createIndex(EMAIL_INDEX, EMAIL_INDEX, { unique: true });
	for (const table of [EMAIL_CODE, CREDENTIAL, AUTH_SESSION])
		database
			.createObjectStore(table, { keyPath: ID_KEY })
			.createIndex(ACCOUNT_INDEX, ACCOUNT_INDEX);
};

const rowsIn = <Row>(
	request: IDBRequest,
	isRow: (value: unknown) => value is Row
): readonly Row[] => {
	const found: unknown[] = [request.result].flat();
	return found.filter((value) => isRow(value));
};

const transact = <Value>(
	database: IDBDatabase,
	tables: readonly Table[],
	mode: IDBTransactionMode,
	work: Work<Value>
): Promise<Value> =>
	new Promise((resolve, reject) => {
		try {
			const transaction = database.transaction(tables, mode);
			const outcome = work(transaction);
			transaction.addEventListener(COMPLETE_EVENT, () => {
				resolve(outcome());
			});
			transaction.addEventListener(ABORT_EVENT, () => {
				reject(new AccountsUnavailableError());
			});
		} catch {
			reject(new AccountsUnavailableError());
		}
	});
