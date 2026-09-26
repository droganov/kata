import { describe, expect, it } from 'vitest';

import { POST } from './+server.ts';

const PROGRAM_ID = '01a0889d-8ae8-7c8a-b964-0ead5f668a5a';

const requestWith = (body: unknown): Request =>
	new Request('http://localhost/programs/' + PROGRAM_ID + '/session', {
		body: JSON.stringify(body),
		method: 'POST'
	});

describe('POST /programs/[program]/session', () => {
	it('собирает на сервере Занятие выбранной Программы с присланной Историей', async () => {
		const response = await POST({
			params: { program: PROGRAM_ID },
			request: requestWith({ history: [] })
		});
		const view: unknown = await response.json();
		expect(view).toMatchObject({ program: PROGRAM_ID, title: 'Программа: БАЗА + ПУЛ' });
	});

	it('без Истории в теле запроса собирает Занятие с пустой Историей', async () => {
		const response = await POST({
			params: { program: PROGRAM_ID },
			request: new Request('http://localhost/programs/' + PROGRAM_ID + '/session', {
				body: 'не JSON',
				method: 'POST'
			})
		});
		expect(response.status).toBe(200);
	});
});
