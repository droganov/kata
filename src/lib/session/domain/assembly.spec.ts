import { describe, expect, it } from 'vitest';

import type { Program } from './program.ts';
import type { SessionItem } from './session.ts';

import { CATALOG, PROGRAM } from '../../../test/session-fixtures.ts';
import { sessionOf } from './assembly.ts';

const session = sessionOf(PROGRAM, CATALOG);
const itemsOf = (block: string, items = session.items): readonly SessionItem[] =>
	items.filter((item) => item.block === block);
const groupOf = (target: string): string | undefined =>
	CATALOG.targets.find((row) => row.id === target)?.muscleGroup;
const exerciseOf = (id: string): (typeof CATALOG.exercises)[number] | undefined =>
	CATALOG.exercises.find((exercise) => exercise.id === id);

const strengthWith = (draw: Program['blocks'][number]['draw']): Program => ({
	...PROGRAM,
	blocks: [
		{
			...(draw !== undefined && { draw }),
			id: 'block-strength',
			modality: 'loaded',
			name: 'Силовой',
			ord: 1,
			pinnedGroups: [{ id: 'group-glutes', ord: 1, pick: 1 }],
			pinnedTargets: [{ id: 'target-lats', ord: 1, pick: 1 }]
		}
	]
});

describe('sessionOf', () => {
	it('собирает Занятие своей Программы', () => {
		expect(session.program).toBe('program-1');
	});

	it('идёт по Блокам в порядке Программы', () => {
		const blocks = [...new Set(session.items.map((item) => item.block))];
		expect(blocks).toEqual(['block-warmup', 'block-strength']);
	});

	it('нумерует позиции подряд с единицы через всё Занятие', () => {
		expect(session.items.map((item) => item.ord)).toEqual(
			session.items.map((_item, at) => at + 1)
		);
	});

	it('не даёт позиций Блоку, в Режиме которого нет Упражнений', () => {
		expect(itemsOf('block-cardio')).toEqual([]);
	});

	it('берёт из Закреплённой Мишени столько Упражнений, сколько велено, в Режиме Блока', () => {
		const warmup = itemsOf('block-warmup');
		expect(warmup).toHaveLength(2);
		for (const item of warmup) {
			expect(item.target).toBe('target-cervical');
			expect(exerciseOf(item.exercise)?.catalogTarget).toBe('target-cervical');
			expect(exerciseOf(item.exercise)?.modality).toBe('dynamic');
		}
	});

	it('разворачивает Закреплённые Группы мышц в Мишени внутри них, по объявленному порядку', () => {
		const [first, second] = itemsOf('block-strength');
		expect(groupOf(String(first?.target))).toBe('group-glutes');
		expect(groupOf(String(second?.target))).toBe('group-chest');
	});

	it('добирает после Закреплённых ровно count Групп мышц из незакреплённых', () => {
		const drawn = itemsOf('block-strength').slice(2);
		expect(drawn).toHaveLength(1);
		expect(['group-glutes', 'group-chest']).not.toContain(groupOf(String(drawn[0]?.target)));
	});

	it('добирает Мишени, когда добор идёт по Мишеням, мимо закреплённого', () => {
		const items = sessionOf(
			strengthWith({ count: 2, level: 'target', pickEach: 1 }),
			CATALOG
		).items;
		const drawn = items.slice(2);
		expect(drawn).toHaveLength(2);
		for (const item of drawn) {
			expect(item.target).not.toBe('target-lats');
			expect(groupOf(item.target)).not.toBe('group-glutes');
		}
	});

	it('без добора отдаёт только Закреплённое', () => {
		expect(sessionOf(strengthWith(undefined), CATALOG).items).toHaveLength(2);
	});

	it('снимает Дозу с Упражнения', () => {
		for (const item of session.items) expect(item.dose).toBe(exerciseOf(item.exercise)?.dose);
	});

	it('на одинаковом входе даёт одинаковое Занятие', () => {
		expect(sessionOf(PROGRAM, CATALOG)).toEqual(session);
	});
});
