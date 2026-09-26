import { describe, expect, it } from 'vitest';

import { createSession } from '../../../../../lib/session/interface/session.ts';
import { POST } from './+server.ts';

const PROGRAM_ID = '01a0889d-8ae8-7c8a-b964-0ead5f668a5a';

const view = createSession(() => 7).assembleSession(PROGRAM_ID, []);
const items = view.blocks.flatMap((block) =>
	block.items.map((item) => ({
		block: block.id,
		exercise: item.exercise,
		ord: item.ord,
		target: item.target
	}))
);
const [cardio] = items;
const strength = view.blocks[2]!.items[0]!;

const requestWith = (body: unknown): Request =>
	new Request('http://localhost/programs/' + PROGRAM_ID + '/session/redraw', {
		body: JSON.stringify(body),
		method: 'POST'
	});

const redrawAt = (ord: number, level: string): unknown => ({
	history: [],
	redraw: { items, level, ord, rejected: { exercises: [], targets: [] } }
});

describe('POST /programs/[program]/session/redraw', () => {
	it('пересобирает на сервере Позицию Занятия выбранной Программы', async () => {
		const response = await POST({
			params: { program: PROGRAM_ID },
			request: requestWith(redrawAt(strength.ord, 'exercise'))
		});
		expect(response.status).toBe(200);
		expect(await response.json()).toMatchObject({
			item: { ord: strength.ord, target: strength.target }
		});
	});

	it('отвечает 409, когда замены нет', async () => {
		const response = await POST({
			params: { program: PROGRAM_ID },
			request: requestWith(redrawAt(cardio!.ord, 'target'))
		});
		expect(response.status).toBe(409);
	});

	it('отвечает 400, когда в теле нет пересборки', async () => {
		const response = await POST({
			params: { program: PROGRAM_ID },
			request: new Request('http://localhost/', { body: 'не JSON', method: 'POST' })
		});
		expect(response.status).toBe(400);
	});
});
