import type { AuthSession } from '../domain/auth-session.ts';
import type { Credential, NewCredential } from '../domain/credential.ts';
import type { DeviceAccount } from '../domain/device-account.ts';
import type { Person } from '../domain/person.ts';

export type { AuthSession } from '../domain/auth-session.ts';
export type { Credential, NewCredential } from '../domain/credential.ts';
export type { DeviceAccount } from '../domain/device-account.ts';
export type { Person } from '../domain/person.ts';

const ACCOUNTS_UNAVAILABLE = 'Устройство не хранит Аккаунты';
const ACCOUNTS_UNAVAILABLE_NAME = 'AccountsUnavailableError';
const EMAIL_TAKEN = 'Почта уже занята: ';
const EMAIL_TAKEN_NAME = 'EmailTakenError';
const UNKNOWN_ACCOUNT = 'Аккаунта нет: ';
const UNKNOWN_ACCOUNT_NAME = 'UnknownAccountError';
const UNKNOWN_KEY = 'Ключ не принадлежит Аккаунту: ';
const UNKNOWN_KEY_NAME = 'UnknownKeyError';

export interface AccountStore {
	account: (account: string) => Promise<Person | undefined>;
	accountByEmail: (email: string) => Promise<Person | undefined>;
	attachKey: (account: string, key: NewCredential) => Promise<Credential>;
	authSession: (session: string) => Promise<AuthSession | undefined>;
	confirmEmail: (account: string, code: string) => Promise<boolean>;
	forgetAccount: (account: string) => Promise<void>;
	issueEmailCode: (account: string) => Promise<void>;
	keysOf: (account: string) => Promise<readonly Credential[]>;
	knownAccounts: () => Promise<readonly DeviceAccount[]>;
	registerAccount: (nickname: string, email: string) => Promise<Person>;
	revokeOtherSessions: (account: string, keep: string) => Promise<void>;
	revokeSession: (session: string) => Promise<void>;
	sessionsOf: (account: string) => Promise<readonly AuthSession[]>;
	signIn: (account: string, key: string, device: string) => Promise<AuthSession>;
}

export class AccountsUnavailableError extends Error {
	override readonly name = ACCOUNTS_UNAVAILABLE_NAME;

	constructor() {
		super(ACCOUNTS_UNAVAILABLE);
	}
}

export class EmailTakenError extends Error {
	override readonly name = EMAIL_TAKEN_NAME;

	constructor(email: string) {
		super(EMAIL_TAKEN + email);
	}
}

export class UnknownAccountError extends Error {
	override readonly name = UNKNOWN_ACCOUNT_NAME;

	constructor(account: string) {
		super(UNKNOWN_ACCOUNT + account);
	}
}

export class UnknownKeyError extends Error {
	override readonly name = UNKNOWN_KEY_NAME;

	constructor(key: string) {
		super(UNKNOWN_KEY + key);
	}
}
