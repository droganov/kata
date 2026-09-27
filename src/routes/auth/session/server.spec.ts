import { describe, expect, it, vi } from 'vitest';

import { DELETE, POST } from './+server.ts';

const SESSION = '01a0e029-5400-7000-8000-000000000001';
const DAYS_400 = 400 * 86_400;

const requestWith = (body: unknown): Request =>
	new Request('http://localhost/auth/session', { body: JSON.stringify(body), method: 'POST' });

describe('POST /auth/session', () => {
	it('ставит куку Сеанса сервером: недоступна скрипту, живёт 400 дней', async () => {
		const cookies = { set: vi.fn() };
		const response = await POST({ cookies, request: requestWith({ authSession: SESSION }) });
		expect(response.status).toBe(204);
		expect(cookies.set).toHaveBeenCalledWith('training-auth', SESSION, {
			httpOnly: true,
			maxAge: DAYS_400,
			path: '/',
			sameSite: 'lax'
		});
	});

	it('без токена Сеанса куку не ставит', async () => {
		const cookies = { set: vi.fn() };
		const response = await POST({ cookies, request: requestWith({ authSession: 'x' }) });
		expect(response.status).toBe(400);
		expect(cookies.set).not.toHaveBeenCalled();
	});
});

describe('DELETE /auth/session', () => {
	it('убирает куку Сеанса', () => {
		const cookies = { delete: vi.fn() };
		expect(DELETE({ cookies }).status).toBe(204);
		expect(cookies.delete).toHaveBeenCalledWith('training-auth', { path: '/' });
	});
});
