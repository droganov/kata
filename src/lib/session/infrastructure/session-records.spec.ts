import { describe, expect, it } from 'vitest';

import { activeSessionOf, performedOf } from './session-records.ts';

const SESSION = {
	account: 'person-a',
	marks: [{ ord: 1, status: 'done' }],
	openedAt: '2026-09-14T08:00:00.000Z',
	view: { blocks: [], program: 'program-1', seed: 7, title: 'Закрепления и добор' }
};

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
		JSON.stringify({ ...SESSION, marks: {} }),
		JSON.stringify({ ...SESSION, openedAt: 1 }),
		JSON.stringify({ ...SESSION, view: null }),
		JSON.stringify({ ...SESSION, view: { ...SESSION.view, blocks: {} } }),
		JSON.stringify({ ...SESSION, view: { ...SESSION.view, program: 1 } }),
		JSON.stringify({ ...SESSION, view: { ...SESSION.view, seed: '7' } }),
		JSON.stringify({ ...SESSION, view: { ...SESSION.view, title: 1 } })
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
