import type {
	AccountStore,
	AuthSession,
	DeviceAccount,
	Person
} from '../application/account-store.ts';
import type { Authenticator, SignedIn } from '../application/sign-in.ts';
import type { Fetch } from '../infrastructure/auth-endpoint.ts';

import { confirmAndSignIn, requestEmailCode, signedInOf } from '../application/sign-in.ts';
import { otherDeviceAccounts, switchAccount } from '../application/switch-account.ts';
import { forgetAuthSession, rememberAuthSession } from '../infrastructure/auth-endpoint.ts';
import { createIdbAccountStore } from '../infrastructure/idb-account-store.ts';
import { createStubAuthenticator } from '../infrastructure/stub-authenticator.ts';
import { deviceLabelOf } from './device-label.ts';

export type { AuthSession, DeviceAccount, Person } from '../application/account-store.ts';
export { SIGNED_OUT } from '../application/sign-in.ts';
export type { SignedIn, SignedOut } from '../application/sign-in.ts';
export type { Fetch } from '../infrastructure/auth-endpoint.ts';

const UNDEFINED_KIND = 'undefined';

export const signedInBrowserAccount = (authSession: null | string): Promise<SignedIn | undefined> =>
	signedInOf(browserAccountStore(), authSession);

export const browserAccount = (account: string): Promise<Person | undefined> =>
	browserAccountStore().account(account);

export const requestBrowserEmailCode = (nickname: string, email: string): Promise<Person> =>
	requestEmailCode(browserAccountStore(), nickname, email);

export const signInBrowser = async (
	account: Person,
	code: string,
	fetcher: Fetch
): Promise<AuthSession | undefined> => {
	const authSession = await confirmAndSignIn(
		browserAccountStore(),
		browserAuthenticator(),
		account,
		code,
		browserDevice()
	);
	if (authSession !== undefined) await rememberAuthSession(fetcher, authSession.id);
	return authSession;
};

export const signOutBrowser = async (signedIn: SignedIn, fetcher: Fetch): Promise<void> => {
	await forgetAuthSession(fetcher);
	await browserAccountStore().signOut(signedIn.authSession.id);
};

export const otherBrowserAccounts = (signedIn: SignedIn): Promise<readonly DeviceAccount[]> =>
	otherDeviceAccounts(browserAccountStore(), signedIn);

export const switchBrowserAccount = (
	signedIn: SignedIn,
	known: DeviceAccount,
	fetcher: Fetch
): Promise<AuthSession | undefined> =>
	switchAccount(
		browserAccountStore(),
		browserAuthenticator(),
		signedIn,
		known,
		browserDevice(),
		(authSession) => rememberAuthSession(fetcher, authSession.id)
	);

export const forgetBrowserAccount = (account: string): Promise<void> =>
	browserAccountStore().forgetAccount(account);

const browserAuthenticator = (): Authenticator => createStubAuthenticator(randomBytes);

const browserDevice = (): string => deviceLabelOf(navigator.userAgent);

const browserAccountStore = (): AccountStore =>
	createIdbAccountStore({
		indexedDB: typeof indexedDB === UNDEFINED_KIND ? undefined : indexedDB,
		now: () => new Date(),
		randomBytes,
		storage: sessionStorage
	});

const randomBytes = (length: number): Uint8Array => crypto.getRandomValues(new Uint8Array(length));
