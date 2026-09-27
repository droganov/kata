import type { AccountStore, AuthSession, DeviceAccount } from './account-store.ts';
import type { Authenticator, SignedIn } from './sign-in.ts';

export type Remember = (authSession: AuthSession) => Promise<void>;

export const otherDeviceAccounts = async (
	store: AccountStore,
	signedIn: SignedIn
): Promise<readonly DeviceAccount[]> => {
	const known = await store.knownAccounts();
	return known.filter((entry) => entry.account !== signedIn.account.id);
};

export const switchAccount = async (
	store: AccountStore,
	authenticator: Authenticator,
	signedIn: SignedIn,
	known: DeviceAccount,
	device: string,
	remember: Remember
): Promise<AuthSession | undefined> => {
	const keys = await store.keysOf(known.account);
	const key = await authenticator.confirmKey(keys.filter((owned) => owned.id === known.key));
	if (key === undefined) return;
	const authSession = await store.signIn(known.account, key.id, device);
	await remember(authSession);
	await store.signOut(signedIn.authSession.id);
	return authSession;
};
