import { describe, expect, it } from 'vitest';

import { SESSION_VIEW } from '../../../test/store-contract.ts';
import { fetchRedrawnItem, fetchSessionView } from './session-endpoint.ts';
import { historyOf, redrawOf } from './session-records.ts';

const HISTORY = [{ doneAt: '2026-09-25T09:00:00.000Z', exercise: 'ex-press' }];
const REDRAW = {
	items: [{ block: 'block-strength', exercise: 'ex-press', ord: 3, target: 'target-chest' }],
	level: 'exercise',
	ord: 3,
	rejected: { exercises: [], targets: [] }
} as const;
const REDRAWN = {
	item: SESSION_VIEW.blocks[1]!.items[1]!,
	options: [{ isExerciseRedrawable: false, isTargetRedrawable: true, ord: 3 }],
	rejected: { exercises: ['ex-press'], targets: [] }
};

const nothingToRedraw = (): Promise<Response> =>
	Promise.resolve(new Response(null, { status: 409 }));

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

describe('fetchRedrawnItem', () => {
	it('отправляет серверу пересборку с Историей и забирает замену Позиции', async () => {
		const sent: Request[] = [];
		const fetcher = (input: string, init?: RequestInit): Promise<Response> => {
			sent.push(new Request('http://localhost' + input, init));
			return Promise.resolve(Response.json(REDRAWN));
		};
		expect(await fetchRedrawnItem(fetcher, 'program 1', HISTORY, REDRAW)).toEqual(REDRAWN);
		const [request] = sent;
		expect(request?.url).toBe('http://localhost/programs/program%201/session/redraw');
		expect(request?.method).toBe('POST');
		const body: unknown = await request?.json();
		expect(historyOf(body)).toEqual(HISTORY);
		expect(redrawOf(body)).toEqual(REDRAW);
	});

	it('без замены на сервере ничего не отдаёт', async () => {
		expect(
			await fetchRedrawnItem(nothingToRedraw, 'program-1', HISTORY, REDRAW)
		).toBeUndefined();
	});

	it.each([
		['сервер ответил ошибкой', () => Response.json(REDRAWN, { status: 500 })],
		['сервер прислал не Позицию', () => Response.json({ name: 'Жим' })]
	])('бросает, когда %s', async (_case, respond) => {
		await expect(
			fetchRedrawnItem(() => Promise.resolve(respond()), 'program-1', HISTORY, REDRAW)
		).rejects.toThrow('program-1');
	});
});
