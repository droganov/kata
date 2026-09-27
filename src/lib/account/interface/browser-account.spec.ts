import { IDBFactory } from 'fake-indexeddb';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
	browserAccount,
	browserAuthSessions,
	requestBrowserEmailCode,
	revokeBrowserAuthSession,
	revokeOtherBrowserAuthSessions,
	signedInBrowserAccount,
	signInBrowser
} from './browser-account.ts';

const NO_CONTENT = 204;
const IPHONE =
	'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';

const serveCookie = vi.fn(() => Promise.resolve(new Response(null, { status: NO_CONTENT })));

const signedInWith = async (email = 'sergei@example.com'): Promise<string> => {
	const person = await requestBrowserEmailCode('Sergei', email);
	const session = await signInBrowser(person, '000000', serveCookie);
	return session!.id;
};

describe('Вход в браузере', () => {
	beforeEach(() => {
		vi.stubGlobal('indexedDB', new IDBFactory());
		vi.stubGlobal('navigator', { userAgent: IPHONE });
		serveCookie.mockClear();
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('регистрирует, открывает Сеанс с меткой устройства и просит сервер поставить куку', async () => {
		const session = await signedInWith();
		const signedIn = await signedInBrowserAccount(session);
		expect(signedIn?.account.nickname).toBe('Sergei');
		expect(signedIn?.authSession.deviceLabel).toBe('iPhone · Safari');
		expect(serveCookie).toHaveBeenCalledWith(
			'/auth/session',
			expect.objectContaining({ method: 'POST' })
		);
	});

	it('находит Аккаунт экрана кода по идентификатору', async () => {
		const person = await requestBrowserEmailCode('Sergei', 'sergei@example.com');
		expect(await browserAccount(person.id)).toEqual(person);
	});

	it('без выпущенного кода не входит и куку не просит', async () => {
		const person = await requestBrowserEmailCode('Sergei', 'sergei@example.com');
		await signInBrowser(person, '000000', serveCookie);
		serveCookie.mockClear();
		expect(await signInBrowser(person, '000000', serveCookie)).toBeUndefined();
		expect(serveCookie).not.toHaveBeenCalled();
	});

	it('гасит чужой Сеанс, не трогая куку текущего', async () => {
		const current = await signedInWith();
		const other = await signedInWith();
		const signedIn = await signedInBrowserAccount(current);
		serveCookie.mockClear();
		await revokeBrowserAuthSession(signedIn!, other, serveCookie);
		expect(await signedInBrowserAccount(other)).toBeUndefined();
		expect(await signedInBrowserAccount(current)).toBeDefined();
		expect(serveCookie).not.toHaveBeenCalled();
	});

	it('гасит текущий Сеанс и просит сервер забыть куку', async () => {
		const current = await signedInWith();
		const signedIn = await signedInBrowserAccount(current);
		await revokeBrowserAuthSession(signedIn!, current, serveCookie);
		expect(await signedInBrowserAccount(current)).toBeUndefined();
		expect(serveCookie).toHaveBeenLastCalledWith('/auth/session', { method: 'DELETE' });
	});

	it('гасит все Сеансы кроме текущего', async () => {
		const current = await signedInWith();
		await signedInWith();
		await signedInWith();
		const signedIn = await signedInBrowserAccount(current);
		await revokeOtherBrowserAuthSessions(signedIn!);
		const sessions = await browserAuthSessions(signedIn!.account.id);
		expect(sessions.map((session) => session.id)).toEqual([current]);
	});

	it('без IndexedDB вошедшим не считает', async () => {
		vi.stubGlobal('indexedDB', undefined);
		expect(
			await signedInBrowserAccount('01a0e029-5400-7000-8000-000000000000')
		).toBeUndefined();
	});
});
