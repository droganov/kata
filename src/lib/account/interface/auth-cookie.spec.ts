import { describe, expect, it } from 'vitest';

import { AUTH_COOKIE_OPTIONS, authSessionOf } from './auth-cookie.ts';

const SESSION = '01a0e029-5400-7000-8000-000000000000';

const requestWith = (body: string): Request =>
	new Request('http://localhost/auth/session', { body, method: 'POST' });

describe('кука Сеанса', () => {
	it('недоступна скриптам и живёт дольше семи дней', () => {
		expect(AUTH_COOKIE_OPTIONS.httpOnly).toBe(true);
		expect(AUTH_COOKIE_OPTIONS.maxAge).toBeGreaterThan(7 * 86_400);
		expect(AUTH_COOKIE_OPTIONS).toMatchObject({ path: '/', sameSite: 'lax' });
	});

	it('берёт токен Сеанса из тела запроса', async () => {
		const request = requestWith(JSON.stringify({ authSession: SESSION }));
		expect(await authSessionOf(request)).toBe(SESSION);
	});

	it('не берёт ничего, кроме UUIDv7 в поле authSession', async () => {
		for (const body of [
			'не json',
			'null',
			'"строка"',
			JSON.stringify({}),
			JSON.stringify({ authSession: 7 }),
			JSON.stringify({ authSession: 'не uuid' })
		])
			expect(await authSessionOf(requestWith(body))).toBeUndefined();
	});
});
