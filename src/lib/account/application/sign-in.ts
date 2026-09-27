import type {
	AccountStore,
	AuthSession,
	Credential,
	NewCredential,
	Person
} from './account-store.ts';

import { isLive } from '../domain/auth-session.ts';
import { emailOf, nicknameOf } from '../domain/person.ts';
import { AccountsUnavailableError } from './account-store.ts';

export { InvalidEmailError } from '../domain/person.ts';

export interface Authenticator {
	confirmKey: (keys: readonly Credential[]) => Promise<Credential | undefined>;
	createKey: (account: Person) => Promise<NewCredential>;
}

export interface SignedIn {
	readonly account: Person;
	readonly authSession: AuthSession;
}

export interface SignedOut {
	readonly signedIn: undefined;
}

export const SIGNED_OUT: SignedOut = { signedIn: undefined };

export const requestEmailCode = async (
	store: AccountStore,
	nickname: string,
	email: string
): Promise<Person> => {
	const address = emailOf(email);
	const name = nicknameOf(nickname);
	const person =
		(await store.accountByEmail(address)) ?? (await store.registerAccount(name, address));
	await store.issueEmailCode(person.id);
	return person;
};

export const confirmAndSignIn = async (
	store: AccountStore,
	authenticator: Authenticator,
	account: Person,
	code: string,
	device: string
): Promise<AuthSession | undefined> => {
	if (!(await store.confirmEmail(account.id, code))) return;
	const key = await store.attachKey(account.id, await authenticator.createKey(account));
	return store.signIn(account.id, key.id, device);
};

export const signedInOf = async (
	store: AccountStore,
	authSession: null | string
): Promise<SignedIn | undefined> => {
	if (authSession === null) return;
	try {
		return await liveSignedIn(store, authSession);
	} catch (error) {
		if (error instanceof AccountsUnavailableError) return;
		throw error;
	}
};

const liveSignedIn = async (
	store: AccountStore,
	authSession: string
): Promise<SignedIn | undefined> => {
	const found = await store.authSession(authSession);
	if (found === undefined || !isLive(found)) return;
	const account = await store.account(found.account);
	return account === undefined ? undefined : { account, authSession: found };
};
