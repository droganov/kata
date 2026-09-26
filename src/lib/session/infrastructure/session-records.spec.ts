import { describe, expect, it } from 'vitest';

import { activeSessionOf, historyOf, isRedrawn, performedOf, redrawOf } from './session-records.ts';

const DETAIL = {
	equipment: [{ name: 'Тело', role: 'главное' }],
	steps: [
		{
			id: 'step-1',
			oracles: [
				{ counterModel: ['рывок'], id: 'o-1', model: ['плавно'], predicate: 'Ровно' }
			],
			title: 'Наклон'
		}
	],
	targets: [{ names: 'Шея', role: 'Первичные' }]
};

const ITEM = {
	detail: DETAIL,
	dose: '2×10',
	drawNo: 1,
	exercise: 'ex-neck-roll',
	isExerciseRedrawable: false,
	isTargetRedrawable: false,
	name: 'Круги',
	ord: 1,
	target: 'target-cervical'
};

const SESSION = {
	account: 'person-a',
	markedAt: '2026-09-14T08:10:00.000Z',
	marks: [{ ord: 1, status: 'done' }],
	openedAt: '2026-09-14T08:00:00.000Z',
	rejected: { exercises: ['ex-neck-tilt'], targets: [] },
	view: {
		blocks: [{ id: 'block-warmup', items: [ITEM], name: 'Разминка' }],
		program: 'program-1',
		seed: 7,
		title: 'Закрепления и добор'
	}
};

const REDRAW = {
	items: [{ block: 'block-warmup', exercise: 'ex-neck-roll', ord: 1, target: 'target-cervical' }],
	level: 'exercise',
	ord: 1,
	rejected: { exercises: ['ex-neck-tilt'], targets: [] }
};

const withItem = (item: object): string =>
	JSON.stringify({
		...SESSION,
		view: { ...SESSION.view, blocks: [{ id: 'block-warmup', items: [item], name: 'Разминка' }] }
	});

const withDetail = (detail: object): string =>
	withItem({ ...ITEM, detail: { ...DETAIL, ...detail } });

describe('activeSessionOf', () => {
	it('читает сохранённое Активное занятие', () => {
		expect(activeSessionOf(JSON.stringify(SESSION))).toEqual(SESSION);
	});

	it('без записи Активного занятия нет', () => {
		expect(activeSessionOf(null)).toBeUndefined();
	});

	it.each([
		'{',
		'null',
		'[]',
		JSON.stringify({ ...SESSION, account: 1 }),
		JSON.stringify({ ...SESSION, markedAt: undefined }),
		JSON.stringify({ ...SESSION, marks: {} }),
		JSON.stringify({ ...SESSION, openedAt: 1 }),
		JSON.stringify({ ...SESSION, view: null }),
		JSON.stringify({ ...SESSION, view: { ...SESSION.view, blocks: {} } }),
		JSON.stringify({ ...SESSION, view: { ...SESSION.view, program: 1 } }),
		JSON.stringify({ ...SESSION, view: { ...SESSION.view, seed: '7' } }),
		JSON.stringify({ ...SESSION, view: { ...SESSION.view, title: 1 } }),
		JSON.stringify({ ...SESSION, view: { ...SESSION.view, blocks: [null] } }),
		JSON.stringify({ ...SESSION, view: { ...SESSION.view, blocks: [{ id: 'b', name: 'Б' }] } }),
		withItem({ ...ITEM, ord: '1' }),
		withItem({ ...ITEM, dose: 2 }),
		withItem({ ...ITEM, drawNo: '1' }),
		withItem({ ...ITEM, isTargetRedrawable: 'no' }),
		withItem({ ...ITEM, isExerciseRedrawable: 'no' }),
		withItem({ ...ITEM, target: undefined }),
		JSON.stringify({ ...SESSION, rejected: undefined }),
		JSON.stringify({ ...SESSION, rejected: { exercises: [1], targets: [] } }),
		JSON.stringify({ ...SESSION, rejected: { exercises: [], targets: null } }),
		withItem({ ...ITEM, detail: null }),
		withDetail({ equipment: 'Тело — main' }),
		withDetail({ targets: 'Шея — primary' }),
		withDetail({ equipment: [{ name: 'Тело' }] }),
		withDetail({ targets: [{ name: 'Шея', role: 'primary' }] }),
		withDetail({ note: 1 }),
		withDetail({ steps: [{ active: 'Шея', id: 'step-1', title: 'Наклон' }] }),
		withDetail({ steps: [{ ...DETAIL.steps[0], oracles: [{ predicate: 'Ровно' }] }] })
	])('не принимает испорченную запись за Активное занятие: %s', (text) => {
		expect(activeSessionOf(text)).toBeUndefined();
	});
});

describe('performedOf', () => {
	it('читает выполненные Упражнения', () => {
		const performed = [{ doneAt: '2026-09-14T08:00:00.000Z', exercise: 'ex-bridge' }];
		expect(performedOf(performed)).toEqual(performed);
	});

	it.each([undefined, 'ex-bridge', { doneAt: 'x', exercise: 'y' }])(
		'без списка Истории отдаёт пусто: %s',
		(value) => {
			expect(performedOf(value)).toEqual([]);
		}
	);

	it('пропускает испорченные записи Истории', () => {
		expect(
			performedOf([
				1,
				null,
				{ doneAt: 1, exercise: 'ex-bridge' },
				{ doneAt: '2026-09-14T08:00:00.000Z', exercise: 2 },
				{ doneAt: '2026-09-14T08:00:00.000Z', exercise: 'ex-press' }
			])
		).toEqual([{ doneAt: '2026-09-14T08:00:00.000Z', exercise: 'ex-press' }]);
	});
});

describe('historyOf', () => {
	const history = [{ doneAt: '2026-09-25T09:00:00.000Z', exercise: 'ex-press' }];

	it('читает Историю из тела запроса и отбрасывает то, что Историей не является', () => {
		expect(historyOf({ history: [...history, { exercise: 7 }, 'ex-press'] })).toEqual(history);
	});

	it.each([undefined, null, [history], { title: 'Закрепления и добор' }])(
		'без Истории в теле запроса отдаёт пусто: %s',
		(body) => {
			expect(historyOf(body)).toEqual([]);
		}
	);
});

describe('isRedrawn', () => {
	it('узнаёт ответ пересборки и не узнаёт испорченный', () => {
		const options = [{ isExerciseRedrawable: true, isTargetRedrawable: false, ord: 1 }];
		const redrawn = { item: ITEM, options, rejected: REDRAW.rejected };
		expect(isRedrawn(redrawn)).toBe(true);
		expect(isRedrawn({ ...redrawn, item: { ...ITEM, target: 1 } })).toBe(false);
		expect(isRedrawn({ ...redrawn, options: [{ ...options[0], ord: '1' }] })).toBe(false);
		expect(isRedrawn({ ...redrawn, options: [{ ...options[0], isTargetRedrawable: 1 }] })).toBe(
			false
		);
		expect(
			isRedrawn({ ...redrawn, options: [{ ...options[0], isExerciseRedrawable: 1 }] })
		).toBe(false);
		expect(isRedrawn({ ...redrawn, rejected: null })).toBe(false);
		expect(isRedrawn(null)).toBe(false);
	});
});

describe('redrawOf', () => {
	it('читает из тела запроса, что пересобрать', () => {
		expect(redrawOf({ history: [], redraw: REDRAW })).toEqual(REDRAW);
		expect(redrawOf({ redraw: { ...REDRAW, level: 'target' } })?.level).toBe('target');
	});

	it.each([
		undefined,
		null,
		{},
		{ redraw: null },
		{ redraw: { ...REDRAW, level: 'session' } },
		{ redraw: { ...REDRAW, level: 1 } },
		{ redraw: { ...REDRAW, ord: '1' } },
		{ redraw: { ...REDRAW, items: {} } },
		{ redraw: { ...REDRAW, items: [{ ...REDRAW.items[0], block: 1 }] } },
		{ redraw: { ...REDRAW, items: [{ ...REDRAW.items[0], exercise: 1 }] } },
		{ redraw: { ...REDRAW, items: [{ ...REDRAW.items[0], ord: '1' }] } },
		{ redraw: { ...REDRAW, items: [{ ...REDRAW.items[0], target: 1 }] } },
		{ redraw: { ...REDRAW, rejected: null } }
	])('не читает испорченную пересборку: %j', (body) => {
		expect(redrawOf(body)).toBeUndefined();
	});
});
