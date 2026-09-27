import { describe, expect, it, vi } from 'vitest';

import { SESSION_VIEW } from '../../../test/store-contract.ts';
import { fetchRedrawnItem, fetchSessionView, hasDeliveredMarks } from './session-endpoint.ts';
import { historyOf, redrawOf, sentMarksOf } from './session-records.ts';

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

const MARK = {
	exercise: 'ex-press',
	markedAt: '2026-09-25T09:00:00.000Z',
	ord: 3,
	program: 'program-1',
	seed: 7,
	status: 'done'
} as const;

const hanging = (_input: string, init?: RequestInit): Promise<Response> =>
	new Promise((_resolve, reject) => {
		init?.signal?.addEventListener('abort', () => {
			reject(new DOMException('timeout', 'TimeoutError'));
		});
	});

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

describe('hasDeliveredMarks', () => {
	it('отправляет Отметки и считает их доставленными по ответу 204', async () => {
		const sent: Request[] = [];
		const fetcher = (input: string, init?: RequestInit): Promise<Response> => {
			sent.push(new Request('http://localhost' + input, init));
			return Promise.resolve(new Response(null, { status: 204 }));
		};
		expect(await hasDeliveredMarks(fetcher, [MARK])).toBe(true);
		const [request] = sent;
		expect(request?.url).toBe('http://localhost/marks');
		expect(request?.method).toBe('POST');
		expect(request?.cache).toBe('no-store');
		expect(sentMarksOf(await request?.json())).toEqual([MARK]);
	});

	it.each([
		['запрос отказал', () => Promise.reject(new TypeError('Failed to fetch'))],
		[
			'точка доступа без интернета ответила своей страницей',
			() => Promise.resolve(new Response('<html>Войдите в сеть</html>', { status: 200 }))
		],
		['точка доступа требует входа', () => Promise.resolve(new Response(null, { status: 511 }))],
		['сервер недоступен', () => Promise.resolve(new Response(null, { status: 503 }))]
	])('без связи, когда %s', async (_case, respond) => {
		expect(await hasDeliveredMarks(respond, [MARK])).toBe(false);
	});

	it('без связи, когда ответа нет дольше срока', async () => {
		vi.useFakeTimers();
		const delivered = hasDeliveredMarks(hanging, []);
		await vi.advanceTimersByTimeAsync(10_000);
		expect(await delivered).toBe(false);
		vi.useRealTimers();
	});
});
