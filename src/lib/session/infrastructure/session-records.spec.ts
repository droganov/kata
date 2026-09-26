import { describe, expect, it } from 'vitest';

import { activeSessionOf, performedOf } from './session-records.ts';

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

const ITEM = { detail: DETAIL, dose: '2×10', exercise: 'ex-neck-roll', name: 'Круги', ord: 1 };

const SESSION = {
	account: 'person-a',
	markedAt: '2026-09-14T08:10:00.000Z',
	marks: [{ ord: 1, status: 'done' }],
	openedAt: '2026-09-14T08:00:00.000Z',
	view: {
		blocks: [{ id: 'block-warmup', items: [ITEM], name: 'Разминка' }],
		program: 'program-1',
		seed: 7,
		title: 'Закрепления и добор'
	}
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
