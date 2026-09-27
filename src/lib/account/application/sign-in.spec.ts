import { IDBFactory } from 'fake-indexeddb';
import { describe, expect, it } from 'vitest';

import type { AccountStore } from './account-store.ts';

import { NEW_KEY, SIGNED_UP_AT } from '../../../test/account-store-contract.ts';
import { InvalidEmailError, InvalidNicknameError } from '../domain/person.ts';
import { createIdbAccountStore } from '../infrastructure/idb-account-store.ts';
import { confirmAndSignIn, requestEmailCode, signedInOf } from './sign-in.ts';

const DEVICE = 'iPhone · Safari';
const ANY_CODE = '123456';

const randomBytes = (length: number): Uint8Array => crypto.getRandomValues(new Uint8Array(length));

const storeOn = (indexedDB: IDBFactory | undefined): AccountStore =>
	createIdbAccountStore({ indexedDB, now: () => SIGNED_UP_AT, randomBytes });

const newStore = (): AccountStore => storeOn(new IDBFactory());

const authenticator = {
	confirmKey: () => Promise.resolve(undefined),
	createKey: () => Promise.resolve(NEW_KEY)
};

describe('запрос кода подтверждения', () => {
	it('заводит Аккаунт по никнейму и почте и выпускает ему код', async () => {
		const store = newStore();
		const person = await requestEmailCode(store, ' Sergei ', ' Sergei@Example.com ');
		expect(person).toMatchObject({ email: 'sergei@example.com', nickname: 'Sergei' });
		expect(
			await confirmAndSignIn(store, authenticator, person, ANY_CODE, DEVICE)
		).toBeDefined();
	});

	it('находит Аккаунт по почте и второго не заводит', async () => {
		const store = newStore();
		const first = await requestEmailCode(store, 'Sergei', 'sergei@example.com');
		const second = await requestEmailCode(store, 'Другое имя', 'SERGEI@example.com');
		expect(second).toEqual(first);
	});

	it('без никнейма или с неправильной почтой ничего не заводит', async () => {
		const store = newStore();
		await expect(requestEmailCode(store, ' ', 'sergei@example.com')).rejects.toThrow(
			InvalidNicknameError
		);
		await expect(requestEmailCode(store, 'Sergei', 'sergei')).rejects.toThrow(
			InvalidEmailError
		);
		expect(await store.accountByEmail('sergei@example.com')).toBeUndefined();
	});
});

describe('подтверждение кода и вход', () => {
	it('подтверждает почту, привязывает новый ключ и открывает Сеанс на устройстве', async () => {
		const store = newStore();
		const person = await requestEmailCode(store, 'Sergei', 'sergei@example.com');
		const session = await confirmAndSignIn(store, authenticator, person, ANY_CODE, DEVICE);
		const [key] = await store.keysOf(person.id);
		expect(session).toMatchObject({ account: person.id, deviceLabel: DEVICE, key: key?.id });
		const confirmed = await store.account(person.id);
		expect(confirmed?.emailVerifiedAt).toBe(SIGNED_UP_AT.toISOString());
	});

	it('без выпущенного кода ключ не создаёт и Сеанс не открывает', async () => {
		const store = newStore();
		const person = await store.registerAccount('Sergei', 'sergei@example.com');
		expect(
			await confirmAndSignIn(store, authenticator, person, ANY_CODE, DEVICE)
		).toBeUndefined();
		expect(await store.keysOf(person.id)).toEqual([]);
	});

	it('второе устройство получает второй ключ к тому же Аккаунту', async () => {
		const store = newStore();
		const person = await requestEmailCode(store, 'Sergei', 'sergei@example.com');
		await confirmAndSignIn(store, authenticator, person, ANY_CODE, DEVICE);
		const again = await requestEmailCode(store, 'Sergei', 'sergei@example.com');
		await confirmAndSignIn(store, authenticator, again, ANY_CODE, 'Mac · Chrome');
		expect(await store.keysOf(person.id)).toHaveLength(2);
		expect(await store.sessionsOf(person.id)).toHaveLength(2);
	});
});

describe('текущий Сеанс', () => {
	it('по токену из куки находит живой Сеанс и его Аккаунт', async () => {
		const store = newStore();
		const person = await requestEmailCode(store, 'Sergei', 'sergei@example.com');
		const session = await confirmAndSignIn(store, authenticator, person, ANY_CODE, DEVICE);
		expect(await signedInOf(store, session?.id ?? null)).toEqual({
			account: { ...person, emailVerifiedAt: SIGNED_UP_AT.toISOString() },
			authSession: session
		});
	});

	it('без токена в хранилище не ходит', async () => {
		expect(await signedInOf(storeOn(undefined), null)).toBeUndefined();
	});

	it('погашенный или неизвестный Сеанс входом не считает', async () => {
		const store = newStore();
		const person = await requestEmailCode(store, 'Sergei', 'sergei@example.com');
		const session = await confirmAndSignIn(store, authenticator, person, ANY_CODE, DEVICE);
		await store.revokeSession(session?.id ?? '');
		expect(await signedInOf(store, session?.id ?? null)).toBeUndefined();
		expect(await signedInOf(store, 'unknown')).toBeUndefined();
	});

	it('когда устройство не хранит Аккаунты, входом не считает', async () => {
		expect(await signedInOf(storeOn(undefined), 'session')).toBeUndefined();
	});

	it('прочие отказы не глотает', async () => {
		const store: AccountStore = {
			...newStore(),
			authSession: () => Promise.reject(new Error('сбой'))
		};
		await expect(signedInOf(store, 'session')).rejects.toThrow('сбой');
	});
});

describe('Аккаунт Сеанса', () => {
	it('Сеанс без Аккаунта входом не считает', async () => {
		const store = newStore();
		const person = await requestEmailCode(store, 'Sergei', 'sergei@example.com');
		const session = await confirmAndSignIn(store, authenticator, person, ANY_CODE, DEVICE);
		const orphaned: AccountStore = { ...store, account: () => Promise.resolve(undefined) };
		expect(await signedInOf(orphaned, session?.id ?? null)).toBeUndefined();
	});
});
