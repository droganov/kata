import { describe, expect, it } from 'vitest';

import { POST } from './+server.ts';

const MARK = {
	exercise: 'ex-press',
	markedAt: '2026-09-25T09:00:00.000Z',
	ord: 3,
	program: 'program-1',
	seed: 7,
	status: 'done'
};

const requestWith = (body: string): Request =>
	new Request('http://localhost/marks', { body, method: 'POST' });

describe('POST /marks', () => {
	it('принимает Отметки и подтверждает доставку ответом 204 без тела', async () => {
		const response = await POST({ request: requestWith(JSON.stringify({ marks: [MARK] })) });
		expect(response.status).toBe(204);
		expect(await response.text()).toBe('');
	});

	it('пустой список тоже подтверждает: так проверяется связь', async () => {
		const response = await POST({ request: requestWith(JSON.stringify({ marks: [] })) });
		expect(response.status).toBe(204);
	});

	it.each([
		['не JSON', 'не JSON'],
		['без списка Отметок', JSON.stringify({})],
		['с чужим статусом', JSON.stringify({ marks: [{ ...MARK, status: 'rejected' }] })]
	])('отвечает 400 на тело %s', async (_case, body) => {
		const response = await POST({ request: requestWith(body) });
		expect(response.status).toBe(400);
	});
});
