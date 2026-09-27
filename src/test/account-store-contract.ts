import { describe, expect, it } from 'vitest';

import type { AccountStore, NewCredential } from '../lib/account/application/account-store.ts';

import {
	EmailTakenError,
	UnknownAccountError,
	UnknownKeyError
} from '../lib/account/application/account-store.ts';
import { isUuid } from '../lib/shared/uuid.ts';

export type AccountStoreFactory = (now: () => Date) => AccountStore;

export const SIGNED_UP_AT = new Date('2026-09-27T08:00:00.000Z');

const EMAIL = 'sergei@example.com';
const OTHER_EMAIL = 'anna@example.com';
const HANDLE_HEX = /^[0-9a-f]{128}$/;
const ANY_CODE = '000000';
const DEVICE = 'iPhone · Safari';
const OTHER_DEVICE = 'Mac · Chrome';
const MINUTE_MS = 60_000;
const UNKNOWN = '019990aa-0000-7000-8000-000000000000';

export const NEW_KEY: NewCredential = {
	backedUp: true,
	credentialId: 'c0ffee',
	publicKey: 'beef',
	signCount: 0,
	transports: ['internal']
};

const minutesAfterSignUp = (minutes: number): Date =>
	new Date(SIGNED_UP_AT.getTime() + minutes * MINUTE_MS);

export const describeAccountStoreContract = (
	name: string,
	createStore: AccountStoreFactory
): void => {
	describe(`${name}: контракт Хранилища Аккаунтов`, () => {
		it('заводит Аккаунт по никнейму и почте, почта ещё не подтверждена', async () => {
			const store = createStore(() => SIGNED_UP_AT);
			const person = await store.registerAccount('Sergei', EMAIL);
			expect(person).toMatchObject({
				createdAt: SIGNED_UP_AT.toISOString(),
				email: EMAIL,
				emailVerifiedAt: null,
				nickname: 'Sergei'
			});
			expect(isUuid(person.id)).toBe(true);
			expect(await store.account(person.id)).toEqual(person);
			expect(await store.accountByEmail(EMAIL)).toEqual(person);
		});

		it('даёт Аккаунту непрозрачный идентификатор на 64 байта, у каждого свой', async () => {
			const store = createStore(() => SIGNED_UP_AT);
			const first = await store.registerAccount('Sergei', EMAIL);
			const second = await store.registerAccount('Anna', OTHER_EMAIL);
			expect(first.handle).toMatch(HANDLE_HEX);
			expect(second.handle).toMatch(HANDLE_HEX);
			expect(second.handle).not.toBe(first.handle);
			expect(second.id).not.toBe(first.id);
		});

		it('неизвестного Аккаунта не находит', async () => {
			const store = createStore(() => SIGNED_UP_AT);
			expect(await store.account(UNKNOWN)).toBeUndefined();
			expect(await store.accountByEmail(EMAIL)).toBeUndefined();
		});

		it('вторую регистрацию на ту же почту не принимает', async () => {
			const store = createStore(() => SIGNED_UP_AT);
			await store.registerAccount('Sergei', EMAIL);
			await expect(store.registerAccount('Другой', EMAIL)).rejects.toThrow(EmailTakenError);
			await expect(store.registerAccount('Другой', EMAIL)).rejects.toThrow(
				'Почта уже занята'
			);
		});

		it('подтверждает почту выпущенным кодом один раз', async () => {
			let now = SIGNED_UP_AT;
			const store = createStore(() => now);
			const person = await store.registerAccount('Sergei', EMAIL);
			await store.issueEmailCode(person.id);
			now = minutesAfterSignUp(1);
			expect(await store.confirmEmail(person.id, ANY_CODE)).toBe(true);
			expect(await store.account(person.id)).toMatchObject({
				emailVerifiedAt: now.toISOString()
			});
			expect(await store.confirmEmail(person.id, ANY_CODE)).toBe(false);
		});

		it('без выпущенного кода почту не подтверждает', async () => {
			const store = createStore(() => SIGNED_UP_AT);
			const person = await store.registerAccount('Sergei', EMAIL);
			expect(await store.confirmEmail(person.id, ANY_CODE)).toBe(false);
			expect(await store.account(person.id)).toMatchObject({ emailVerifiedAt: null });
		});

		it('истёкшим кодом почту не подтверждает', async () => {
			let now = SIGNED_UP_AT;
			const store = createStore(() => now);
			const person = await store.registerAccount('Sergei', EMAIL);
			await store.issueEmailCode(person.id);
			now = minutesAfterSignUp(10);
			expect(await store.confirmEmail(person.id, ANY_CODE)).toBe(false);
		});

		it('первое подтверждение почты не сдвигается повторным', async () => {
			let now = SIGNED_UP_AT;
			const store = createStore(() => now);
			const person = await store.registerAccount('Sergei', EMAIL);
			await store.issueEmailCode(person.id);
			await store.confirmEmail(person.id, ANY_CODE);
			now = minutesAfterSignUp(5);
			await store.issueEmailCode(person.id);
			expect(await store.confirmEmail(person.id, ANY_CODE)).toBe(true);
			expect(await store.account(person.id)).toMatchObject({
				emailVerifiedAt: SIGNED_UP_AT.toISOString()
			});
		});

		it('код подтверждения чужого Аккаунта не подходит', async () => {
			const store = createStore(() => SIGNED_UP_AT);
			const person = await store.registerAccount('Sergei', EMAIL);
			const other = await store.registerAccount('Anna', OTHER_EMAIL);
			await store.issueEmailCode(other.id);
			expect(await store.confirmEmail(person.id, ANY_CODE)).toBe(false);
		});

		it('код неизвестному Аккаунту не выпускает', async () => {
			const store = createStore(() => SIGNED_UP_AT);
			await expect(store.issueEmailCode(UNKNOWN)).rejects.toThrow(UnknownAccountError);
			await expect(store.issueEmailCode(UNKNOWN)).rejects.toThrow('Аккаунта нет');
		});

		it('привязывает ключи к Аккаунту', async () => {
			const store = createStore(() => SIGNED_UP_AT);
			const person = await store.registerAccount('Sergei', EMAIL);
			const other = await store.registerAccount('Anna', OTHER_EMAIL);
			const key = await store.attachKey(person.id, NEW_KEY);
			const second = await store.attachKey(person.id, { ...NEW_KEY, credentialId: 'f00d' });
			await store.attachKey(other.id, { ...NEW_KEY, credentialId: 'babe' });
			expect(key).toMatchObject({
				...NEW_KEY,
				account: person.id,
				createdAt: SIGNED_UP_AT.toISOString(),
				lastUsedAt: null
			});
			expect(isUuid(key.id)).toBe(true);
			expect(await store.keysOf(person.id)).toEqual(expect.arrayContaining([key, second]));
			expect(await store.keysOf(person.id)).toHaveLength(2);
		});

		it('ключ неизвестному Аккаунту не привязывает', async () => {
			const store = createStore(() => SIGNED_UP_AT);
			await expect(store.attachKey(UNKNOWN, NEW_KEY)).rejects.toThrow(UnknownAccountError);
		});

		it('открывает Сеанс ключом Аккаунта на устройстве', async () => {
			const store = createStore(() => SIGNED_UP_AT);
			const person = await store.registerAccount('Sergei', EMAIL);
			const key = await store.attachKey(person.id, NEW_KEY);
			const session = await store.signIn(person.id, key.id, DEVICE);
			expect(session).toMatchObject({
				account: person.id,
				createdAt: SIGNED_UP_AT.toISOString(),
				deviceLabel: DEVICE,
				key: key.id,
				lastSeenAt: SIGNED_UP_AT.toISOString()
			});
			expect(isUuid(session.id)).toBe(true);
			expect(await store.authSession(session.id)).toEqual(session);
			expect(await store.keysOf(person.id)).toEqual([
				{ ...key, lastUsedAt: SIGNED_UP_AT.toISOString() }
			]);
			expect(await store.authSession(UNKNOWN)).toBeUndefined();
		});

		it('чужим ключом Сеанс не открывает', async () => {
			const store = createStore(() => SIGNED_UP_AT);
			const person = await store.registerAccount('Sergei', EMAIL);
			const other = await store.registerAccount('Anna', OTHER_EMAIL);
			const key = await store.attachKey(other.id, NEW_KEY);
			await expect(store.signIn(person.id, key.id, DEVICE)).rejects.toThrow(UnknownKeyError);
			await expect(store.signIn(person.id, UNKNOWN, DEVICE)).rejects.toThrow(
				'Ключ не принадлежит Аккаунту'
			);
		});

		it('закрывает Сеанс на устройстве, прочие не трогает, повтор ничего не делает', async () => {
			const store = createStore(() => SIGNED_UP_AT);
			const person = await store.registerAccount('Sergei', EMAIL);
			const key = await store.attachKey(person.id, NEW_KEY);
			const phone = await store.signIn(person.id, key.id, DEVICE);
			const laptop = await store.signIn(person.id, key.id, OTHER_DEVICE);
			await store.signOut(phone.id);
			await store.signOut(phone.id);
			await store.signOut(UNKNOWN);
			expect(await store.authSession(phone.id)).toBeUndefined();
			expect(await store.authSession(laptop.id)).toEqual(laptop);
			expect(await store.account(person.id)).toEqual(person);
		});

		it('без входов не знает ни одного Аккаунта устройства', async () => {
			const store = createStore(() => SIGNED_UP_AT);
			await store.registerAccount('Sergei', EMAIL);
			expect(await store.knownAccounts()).toEqual([]);
		});

		it('вписывает каждого, кто входил на устройстве, последний вход первым', async () => {
			let now = SIGNED_UP_AT;
			const store = createStore(() => now);
			const person = await store.registerAccount('Sergei', EMAIL);
			const other = await store.registerAccount('Anna', OTHER_EMAIL);
			const key = await store.attachKey(person.id, NEW_KEY);
			const otherKey = await store.attachKey(other.id, { ...NEW_KEY, credentialId: 'babe' });
			await store.signIn(person.id, key.id, DEVICE);
			now = minutesAfterSignUp(1);
			await store.signIn(other.id, otherKey.id, DEVICE);
			now = minutesAfterSignUp(2);
			await store.signIn(person.id, key.id, DEVICE);
			expect(await store.knownAccounts()).toEqual([
				{
					account: person.id,
					key: key.id,
					nickname: 'Sergei',
					signedInAt: minutesAfterSignUp(2).toISOString()
				},
				{
					account: other.id,
					key: otherKey.id,
					nickname: 'Anna',
					signedInAt: minutesAfterSignUp(1).toISOString()
				}
			]);
		});

		it('убирает запись из списка устройства, Аккаунт, ключи и Сеансы остаются', async () => {
			const store = createStore(() => SIGNED_UP_AT);
			const person = await store.registerAccount('Sergei', EMAIL);
			const key = await store.attachKey(person.id, NEW_KEY);
			const session = await store.signIn(person.id, key.id, DEVICE);
			await store.forgetAccount(person.id);
			await store.forgetAccount(person.id);
			await store.forgetAccount(UNKNOWN);
			expect(await store.knownAccounts()).toEqual([]);
			expect(await store.account(person.id)).toEqual(person);
			expect(await store.keysOf(person.id)).toHaveLength(1);
			expect(await store.authSession(session.id)).toEqual(session);
		});

		it('после повторного входа возвращает убранную запись', async () => {
			let now = SIGNED_UP_AT;
			const store = createStore(() => now);
			const person = await store.registerAccount('Sergei', EMAIL);
			const key = await store.attachKey(person.id, NEW_KEY);
			await store.signIn(person.id, key.id, DEVICE);
			await store.forgetAccount(person.id);
			now = minutesAfterSignUp(5);
			await store.signIn(person.id, key.id, DEVICE);
			expect(await store.knownAccounts()).toEqual([
				{
					account: person.id,
					key: key.id,
					nickname: 'Sergei',
					signedInAt: now.toISOString()
				}
			]);
		});

		it('чужим ключом в список устройства не вписывает', async () => {
			const store = createStore(() => SIGNED_UP_AT);
			const person = await store.registerAccount('Sergei', EMAIL);
			const other = await store.registerAccount('Anna', OTHER_EMAIL);
			const key = await store.attachKey(other.id, NEW_KEY);
			await expect(store.signIn(person.id, key.id, DEVICE)).rejects.toThrow(UnknownKeyError);
			expect(await store.knownAccounts()).toEqual([]);
		});
	});
};
