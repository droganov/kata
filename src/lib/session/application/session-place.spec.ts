import { describe, expect, it } from 'vitest';

import type { ActiveSession, SessionMark } from './store.ts';

import { SESSION_START, SESSION_VIEW } from '../../../test/store-contract.ts';
import { nextAfterMark, placeOf, resumeAt } from './session-place.ts';

const sessionWith = (...marks: readonly SessionMark[]): ActiveSession => ({
	account: 'person-a',
	marks,
	openedAt: SESSION_START.toISOString(),
	view: SESSION_VIEW
});

describe('resumeAt', () => {
	it('открывает первую Позицию Занятия без Отметок', () => {
		expect(resumeAt(sessionWith())).toBe(1);
	});

	it('открывает первую неотмеченную Позицию', () => {
		expect(
			resumeAt(sessionWith({ ord: 1, status: 'done' }, { ord: 3, status: 'skipped' }))
		).toBe(2);
	});

	it('оставляет последнюю Позицию, когда отмечено всё', () => {
		const marked = sessionWith(
			{ ord: 1, status: 'done' },
			{ ord: 2, status: 'done' },
			{ ord: 3, status: 'skipped' }
		);
		expect(resumeAt(marked)).toBe(3);
	});
});

describe('nextAfterMark', () => {
	it('переводит к следующей неотмеченной Позиции через границу Блока', () => {
		expect(nextAfterMark(sessionWith({ ord: 1, status: 'done' }), 1)).toBe(2);
	});

	it('перешагивает уже отмеченные Позиции', () => {
		const marked = sessionWith({ ord: 1, status: 'skipped' }, { ord: 2, status: 'done' });
		expect(nextAfterMark(marked, 1)).toBe(3);
	});

	it('возвращается к неотмеченной Позиции до отмеченной', () => {
		const marked = sessionWith({ ord: 2, status: 'done' }, { ord: 3, status: 'done' });
		expect(nextAfterMark(marked, 3)).toBe(1);
	});

	it('остаётся на Позиции, когда неотмеченных не осталось', () => {
		const marked = sessionWith(
			{ ord: 1, status: 'done' },
			{ ord: 2, status: 'done' },
			{ ord: 3, status: 'done' }
		);
		expect(nextAfterMark(marked, 2)).toBe(2);
	});
});

describe('placeOf', () => {
	it('показывает Упражнение Позиции и её место внутри Блока', () => {
		const place = placeOf(sessionWith(), 3);
		expect(place?.item.name).toBe('ex-press');
		expect(place?.inBlock).toEqual({
			block: 'block-strength',
			name: 'Силовой',
			number: 2,
			size: 2
		});
	});

	it('знает соседние Позиции через границы Блоков', () => {
		expect([placeOf(sessionWith(), 1)?.previous, placeOf(sessionWith(), 1)?.next]).toEqual([
			undefined,
			2
		]);
		expect([placeOf(sessionWith(), 2)?.previous, placeOf(sessionWith(), 2)?.next]).toEqual([
			1, 3
		]);
		expect(placeOf(sessionWith(), 3)?.next).toBeUndefined();
	});

	it('несёт Отметку Позиции', () => {
		const marked = sessionWith({ ord: 2, status: 'skipped' });
		expect([placeOf(marked, 2)?.mark, placeOf(marked, 3)?.mark]).toEqual([
			'skipped',
			undefined
		]);
	});

	it('считает отмеченное в каждом Блоке и несёт его Позиции с Дозой или Отметкой', () => {
		const marked = sessionWith({ ord: 1, status: 'done' }, { ord: 3, status: 'skipped' });
		expect(placeOf(marked, 2)?.blocks).toEqual([
			{
				id: 'block-warmup',
				items: [{ dose: '3×12', mark: 'done', name: 'ex-neck-roll', ord: 1 }],
				marked: 1,
				name: 'Разминка'
			},
			{
				id: 'block-strength',
				items: [
					{ dose: '3×12', name: 'ex-bridge', ord: 2 },
					{ dose: '3×12', mark: 'skipped', name: 'ex-press', ord: 3 }
				],
				marked: 1,
				name: 'Силовой'
			}
		]);
	});

	it('ничего не показывает для Позиции вне Занятия', () => {
		expect(placeOf(sessionWith(), 99)).toBeUndefined();
	});
});
