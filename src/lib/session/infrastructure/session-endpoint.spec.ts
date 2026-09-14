import { describe, expect, it, vi } from 'vitest';

import { SESSION_VIEW } from '../../../test/store-contract.ts';
import { fetchSessionView } from './session-endpoint.ts';

describe('fetchSessionView', () => {
	it('забирает у сервера собранное Занятие Программы', async () => {
		const fetcher = vi.fn(() => Promise.resolve(Response.json(SESSION_VIEW)));
		expect(await fetchSessionView(fetcher, 'program 1')).toEqual(SESSION_VIEW);
		expect(fetcher).toHaveBeenCalledWith('/programs/program%201/session');
	});

	it.each([
		['сервер ответил ошибкой', () => Response.json(SESSION_VIEW, { status: 500 })],
		['сервер прислал не Занятие', () => Response.json({ title: 'Закрепления и добор' })]
	])('бросает, когда %s', async (_case, respond) => {
		await expect(
			fetchSessionView(() => Promise.resolve(respond()), 'program-1')
		).rejects.toThrow('program-1');
	});
});
