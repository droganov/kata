import { describe, expect, it, vi } from 'vitest';

import { forgetAuthSession, rememberAuthSession } from './auth-endpoint.ts';

const SESSION = '01a0e029-5400-7000-8000-000000000000';
const NO_CONTENT = 204;
const BAD_REQUEST = 400;

const refusing = (): Promise<Response> =>
	Promise.resolve(new Response(null, { status: BAD_REQUEST }));

describe('кука Сеанса на сервере', () => {
	it('просит сервер запомнить Сеанс', async () => {
		const fetcher = vi.fn(() => Promise.resolve(new Response(null, { status: NO_CONTENT })));
		await rememberAuthSession(fetcher, SESSION);
		expect(fetcher).toHaveBeenCalledWith('/auth/session', {
			body: JSON.stringify({ authSession: SESSION }),
			headers: { 'content-type': 'application/json' },
			method: 'POST'
		});
	});

	it('сообщает, когда сервер Сеанс не запомнил', async () => {
		await expect(rememberAuthSession(refusing, SESSION)).rejects.toThrow(
			'Сервер не запомнил Сеанс'
		);
	});

	it('просит сервер забыть Сеанс', async () => {
		const fetcher = vi.fn(() => Promise.resolve(new Response(null, { status: NO_CONTENT })));
		await forgetAuthSession(fetcher);
		expect(fetcher).toHaveBeenCalledWith('/auth/session', { method: 'DELETE' });
	});

	it('сообщает, когда сервер Сеанс не забыл', async () => {
		await expect(forgetAuthSession(refusing)).rejects.toThrow('Сервер не забыл Сеанс');
	});
});
