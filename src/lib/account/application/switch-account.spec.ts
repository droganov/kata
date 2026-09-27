import { IDBFactory } from 'fake-indexeddb';
import { describe, expect, it } from 'vitest';

import type { AccountStore, Credential, DeviceAccount } from './account-store.ts';
import type { Authenticator, SignedIn } from './sign-in.ts';

import { NEW_KEY, SIGNED_UP_AT } from '../../../test/account-store-contract.ts';
import { createIdbAccountStore } from '../infrastructure/idb-account-store.ts';
import { confirmAndSignIn, requestEmailCode, signedInOf } from './sign-in.ts';
import { otherDeviceAccounts, switchAccount } from './switch-account.ts';

const DEVICE = 'iPhone · Safari';
const ANY_CODE = '123456';

const randomBytes = (length: number): Uint8Array => crypto.getRandomValues(new Uint8Array(length));

const newStore = (): AccountStore =>
	createIdbAccountStore({ indexedDB: new IDBFactory(), now: () => SIGNED_UP_AT, randomBytes });

const confirmingFirst: Authenticator = {
	confirmKey: ([key]) => Promise.resolve(key),
	createKey: () => Promise.resolve(NEW_KEY)
};

const remembering = (): Promise<void> => Promise.resolve();

const refusing = (): Promise<void> => Promise.reject(new Error('сервер не ответил'));

const entryOf = async (
	store: AccountStore,
	signedIn: SignedIn,
	nickname: string
): Promise<DeviceAccount> => {
	const others = await otherDeviceAccounts(store, signedIn);
	const found = others.find((known) => known.nickname === nickname);
	if (found === undefined) throw new Error('записи нет: ' + nickname);
	return found;
};

const declining: Authenticator = {
	...confirmingFirst,
	confirmKey: () => Promise.resolve(undefined)
};

const signedInAs = async (
	store: AccountStore,
	nickname: string,
	email: string
): Promise<SignedIn> => {
	const person = await requestEmailCode(store, nickname, email);
	const session = await confirmAndSignIn(store, confirmingFirst, person, ANY_CODE, DEVICE);
	const signedIn = await signedInOf(store, session?.id ?? null);
	if (signedIn === undefined) throw new Error('вход не состоялся');
	return signedIn;
};

describe('Аккаунты устройства', () => {
	it('показывает всех, кто входил на устройстве, кроме текущего', async () => {
		const store = newStore();
		const anna = await signedInAs(store, 'Anna', 'anna@example.com');
		const sergei = await signedInAs(store, 'Sergei', 'sergei@example.com');
		expect(await otherDeviceAccounts(store, sergei)).toEqual([
			expect.objectContaining({ account: anna.account.id, nickname: 'Anna' })
		]);
		expect(await otherDeviceAccounts(store, anna)).toEqual([
			expect.objectContaining({ account: sergei.account.id, nickname: 'Sergei' })
		]);
	});
});

describe('переключение Аккаунта', () => {
	it('подтверждает ключом из записи, ставит новый Сеанс и только потом гасит прежний', async () => {
		const store = newStore();
		await signedInAs(store, 'Anna', 'anna@example.com');
		const anna = await signedInAs(store, 'Anna', 'anna@example.com');
		const sergei = await signedInAs(store, 'Sergei', 'sergei@example.com');
		const offered: Credential[] = [];
		const authenticator: Authenticator = {
			...confirmingFirst,
			confirmKey: (keys) => {
				offered.push(...keys);
				return confirmingFirst.confirmKey(keys);
			}
		};
		const remembered: string[] = [];
		const remember = async (authSession: { readonly id: string }): Promise<void> => {
			expect(await signedInOf(store, sergei.authSession.id)).toBeDefined();
			remembered.push(authSession.id);
		};
		const switched = await switchAccount(
			store,
			authenticator,
			sergei,
			await entryOf(store, sergei, 'Anna'),
			DEVICE,
			remember
		);
		expect(offered.map((key) => key.id)).toEqual([anna.authSession.key]);
		expect(remembered).toEqual([switched?.id]);
		expect(switched).toMatchObject({ account: anna.account.id, deviceLabel: DEVICE });
		expect(await signedInOf(store, switched?.id ?? null)).toMatchObject({
			account: { id: anna.account.id }
		});
		expect(await signedInOf(store, sergei.authSession.id)).toBeUndefined();
	});

	it('без подтверждения ключом остаётся в текущем Аккаунте', async () => {
		const store = newStore();
		const anna = await signedInAs(store, 'Anna', 'anna@example.com');
		const sergei = await signedInAs(store, 'Sergei', 'sergei@example.com');
		expect(
			await switchAccount(
				store,
				declining,
				sergei,
				await entryOf(store, sergei, 'Anna'),
				DEVICE,
				remembering
			)
		).toBeUndefined();
		expect(await signedInOf(store, sergei.authSession.id)).toEqual(sergei);
		expect(await store.sessionsOf(anna.account.id)).toEqual([anna.authSession]);
	});

	it('когда сервер не поставил куку, остаётся в текущем Сеансе', async () => {
		const store = newStore();
		await signedInAs(store, 'Anna', 'anna@example.com');
		const sergei = await signedInAs(store, 'Sergei', 'sergei@example.com');
		await expect(
			switchAccount(
				store,
				confirmingFirst,
				sergei,
				await entryOf(store, sergei, 'Anna'),
				DEVICE,
				refusing
			)
		).rejects.toThrow('сервер не ответил');
		expect(await signedInOf(store, sergei.authSession.id)).toEqual(sergei);
	});

	it('убранная запись не мешает переключиться обратно после входа', async () => {
		const store = newStore();
		const anna = await signedInAs(store, 'Anna', 'anna@example.com');
		const sergei = await signedInAs(store, 'Sergei', 'sergei@example.com');
		await store.forgetAccount(anna.account.id);
		expect(await otherDeviceAccounts(store, sergei)).toEqual([]);
		const again = await signedInAs(store, 'Anna', 'anna@example.com');
		expect(again.account.id).toBe(anna.account.id);
		expect(await otherDeviceAccounts(store, again)).toEqual([
			expect.objectContaining({ account: sergei.account.id })
		]);
		expect(await otherDeviceAccounts(store, sergei)).toEqual([
			expect.objectContaining({ account: anna.account.id })
		]);
	});
});
