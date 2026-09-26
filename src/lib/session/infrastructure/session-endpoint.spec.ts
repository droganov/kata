import { describe, expect, it } from 'vitest';

import { SESSION_VIEW } from '../../../test/store-contract.ts';
import { fetchSessionView } from './session-endpoint.ts';
import { historyOf } from './session-records.ts';

const HISTORY = [{ doneAt: '2026-09-25T09:00:00.000Z', exercise: 'ex-press' }];

describe('fetchSessionView', () => {
	it('отправляет серверу Историю и забирает собранное Занятие Программы', async () => {
		const sent: Request[] = [];
		const fetcher = (input: string, init?: RequestInit): Promise<Response> => {
			sent.push(new Request('http://localhost' + input, init));
			return Promise.resolve(Response.json(SESSION_VIEW));
		};
		expect(await fetchSessionView(fetcher, 'program 1', HISTORY)).toEqual(SESSION_VIEW);
		const [request] = sent;
		expect(request?.url).toBe('http://localhost/programs/program%201/session');
		expect(request?.method).toBe('POST');
		expect(historyOf(await request?.json())).toEqual(HISTORY);
	});

	it.each([
		['сервер ответил ошибкой', () => Response.json(SESSION_VIEW, { status: 500 })],
		['сервер прислал не Занятие', () => Response.json({ title: 'Закрепления и добор' })]
	])('бросает, когда %s', async (_case, respond) => {
		await expect(
			fetchSessionView(() => Promise.resolve(respond()), 'program-1', HISTORY)
		).rejects.toThrow('program-1');
	});
});
