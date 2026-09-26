import { describe, expect, it } from 'vitest';

import type { Catalog } from './catalog.ts';
import type { Block, Program } from './program.ts';
import type { Redraw, SessionItemRef } from './redraw.ts';

import { CATALOG, PROGRAM } from '../../../test/session-fixtures.ts';
import { noveltyOf } from './novelty.ts';
import { isTargetRedrawable, REDRAW_LEVEL, redrawnItem } from './redraw.ts';

const SEED = 7;
const SEEDS = Array.from({ length: 200 }, (_item, at) => at);
const MANY_SEEDS = Array.from({ length: 1000 }, (_item, at) => at);
const NOW = new Date('2026-09-26T09:00:00Z');
const YESTERDAY = '2026-09-25T09:00:00Z';
const NOTHING_REJECTED = { exercises: [], targets: [] };

const ITEMS: readonly SessionItemRef[] = [
	{ block: 'block-cardio', exercise: 'ex-bike', ord: 1, target: 'target-cardio' },
	{ block: 'block-warmup', exercise: 'ex-neck-roll', ord: 2, target: 'target-cervical' },
	{ block: 'block-warmup', exercise: 'ex-neck-tilt', ord: 3, target: 'target-cervical' },
	{ block: 'block-strength', exercise: 'ex-bridge', ord: 4, target: 'target-glutes' },
	{ block: 'block-strength', exercise: 'ex-press', ord: 5, target: 'target-chest' },
	{ block: 'block-strength', exercise: 'ex-pulldown', ord: 6, target: 'target-lats' },
	{ block: 'block-strength', exercise: 'ex-row', ord: 7, target: 'target-rhomboids' },
	{ block: 'block-stretch', exercise: 'ex-pigeon', ord: 8, target: 'target-glutes' }
];

const redrawOf = (
	level: Redraw['level'],
	ord: number,
	overrides: Partial<Redraw> = {}
): Redraw => ({
	items: ITEMS,
	level,
	ord,
	rejected: NOTHING_REJECTED,
	...overrides
});

const groupOf = (target: string | undefined): string | undefined =>
	CATALOG.targets.find((row) => row.id === target)?.muscleGroup;

const catalogTargetOf = (exercise: string | undefined): string | undefined =>
	CATALOG.exercises.find((row) => row.id === exercise)?.catalogTarget;

const withBlock = (block: Block): Program => ({ ...PROGRAM, blocks: [block] });

const WITH_DIP: Catalog = {
	...CATALOG,
	exercises: [
		...CATALOG.exercises,
		{
			...CATALOG.exercises.find((row) => row.id === 'ex-fly')!,
			id: 'ex-dip',
			name: 'Отжимания'
		}
	]
};

describe('redrawnItem: Упражнение', () => {
	it('меняет только Упражнение, Мишень, Блок и номер Позиции сохраняются', () => {
		const item = redrawnItem(PROGRAM, CATALOG, redrawOf(REDRAW_LEVEL.exercise, 5), SEED);
		expect(item).toEqual({
			block: 'block-strength',
			dose: '3×12',
			exercise: 'ex-fly',
			ord: 5,
			target: 'target-chest'
		});
	});

	it('не возвращает отклонённое и не берёт Упражнение, которое уже есть в Занятии', () => {
		const redraw = redrawOf(REDRAW_LEVEL.exercise, 5, {
			items: [...ITEMS, { ...ITEMS[4]!, exercise: 'ex-fly', ord: 9 }]
		});
		expect(redrawnItem(PROGRAM, WITH_DIP, redraw, SEED)?.exercise).toBe('ex-dip');
		const rejected = { exercises: ['ex-dip'], targets: [] };
		for (const seed of SEEDS)
			expect(redrawnItem(PROGRAM, WITH_DIP, { ...redraw, rejected }, seed)).toBeUndefined();
	});

	it('не находит замены, когда всё Упражнения Мишени уже в Занятии', () => {
		expect(
			redrawnItem(PROGRAM, CATALOG, redrawOf(REDRAW_LEVEL.exercise, 2), SEED)
		).toBeUndefined();
	});

	it('отбирает с весом новизны: выполненное вчера выпадает существенно реже', () => {
		const novelty = noveltyOf([{ doneAt: YESTERDAY, exercise: 'ex-fly' }], NOW);
		const drawn = MANY_SEEDS.map(
			(seed) =>
				redrawnItem(PROGRAM, WITH_DIP, redrawOf(REDRAW_LEVEL.exercise, 5), seed, novelty)
					?.exercise
		);
		const flies = drawn.filter((exercise) => exercise === 'ex-fly').length;
		const dips = drawn.filter((exercise) => exercise === 'ex-dip').length;
		expect(flies).toBeGreaterThan(0);
		expect(flies * 5).toBeLessThan(dips);
	});
});

describe('redrawnItem: Мишень', () => {
	it('меняет Мишень и Упражнение, Группа мышц и Блок сохраняются', () => {
		for (const seed of SEEDS) {
			const item = redrawnItem(PROGRAM, CATALOG, redrawOf(REDRAW_LEVEL.target, 4), seed);
			expect(item).toMatchObject({
				block: 'block-strength',
				exercise: 'ex-abduction',
				ord: 4,
				target: 'target-glute-med'
			});
			expect(groupOf(item?.target)).toBe('group-glutes');
			expect(catalogTargetOf(item?.exercise)).toBe(item?.target);
		}
	});

	it('не возвращает отклонённую Мишень', () => {
		const rejected = { exercises: [], targets: ['target-glute-med'] };
		expect(
			redrawnItem(PROGRAM, CATALOG, redrawOf(REDRAW_LEVEL.target, 4, { rejected }), SEED)
		).toBeUndefined();
	});

	it('не берёт Мишень, которая уже есть в этом Блоке', () => {
		expect(
			redrawnItem(PROGRAM, CATALOG, redrawOf(REDRAW_LEVEL.target, 6), SEED)
		).toBeUndefined();
	});

	it('не берёт Упражнение, отклонённое раньше', () => {
		const rejected = { exercises: ['ex-abduction'], targets: [] };
		expect(
			redrawnItem(PROGRAM, CATALOG, redrawOf(REDRAW_LEVEL.target, 4, { rejected }), SEED)
		).toBeUndefined();
	});

	it('не пересобирает Мишень вне Групп мышц и Закреплённую Мишень', () => {
		expect(
			redrawnItem(PROGRAM, CATALOG, redrawOf(REDRAW_LEVEL.target, 1), SEED)
		).toBeUndefined();
		const pinnedLats = withBlock({
			...PROGRAM.blocks.find((block) => block.id === 'block-strength')!,
			pinnedGroups: [],
			pinnedTargets: [{ id: 'target-lats', ord: 1, pick: 1 }]
		});
		const items = [ITEMS[5]!];
		expect(
			redrawnItem(pinnedLats, CATALOG, redrawOf(REDRAW_LEVEL.target, 6, { items }), SEED)
		).toBeUndefined();
		expect(
			redrawnItem(PROGRAM, CATALOG, redrawOf(REDRAW_LEVEL.target, 6, { items }), SEED)
		).toMatchObject({ exercise: 'ex-row', target: 'target-rhomboids' });
	});

	it('ничего не пересобирает для Позиции, которой нет', () => {
		expect(
			redrawnItem(PROGRAM, CATALOG, redrawOf(REDRAW_LEVEL.exercise, 99), SEED)
		).toBeUndefined();
		const foreign = [{ ...ITEMS[4]!, block: 'block-unknown' }];
		expect(
			redrawnItem(
				PROGRAM,
				CATALOG,
				redrawOf(REDRAW_LEVEL.exercise, 5, { items: foreign }),
				SEED
			)
		).toBeUndefined();
	});
});

describe('isTargetRedrawable', () => {
	it('разрешает пересборку Мишени, когда в её Группе мышц есть другая Мишень Режима Блока', () => {
		expect(isTargetRedrawable(PROGRAM, CATALOG, 'block-strength', 'target-glutes')).toBe(true);
		expect(isTargetRedrawable(PROGRAM, CATALOG, 'block-strength', 'target-lats')).toBe(true);
	});

	it('запрещает её, когда другой Мишени нет, Мишень вне Групп мышц или Закреплена', () => {
		expect(isTargetRedrawable(PROGRAM, CATALOG, 'block-strength', 'target-chest')).toBe(false);
		expect(isTargetRedrawable(PROGRAM, CATALOG, 'block-stretch', 'target-glutes')).toBe(false);
		expect(isTargetRedrawable(PROGRAM, CATALOG, 'block-cardio', 'target-cardio')).toBe(false);
		expect(isTargetRedrawable(PROGRAM, CATALOG, 'block-unknown', 'target-lats')).toBe(false);
		const pinnedLats = withBlock({
			...PROGRAM.blocks.find((block) => block.id === 'block-strength')!,
			pinnedTargets: [{ id: 'target-lats', ord: 1, pick: 1 }]
		});
		expect(isTargetRedrawable(pinnedLats, CATALOG, 'block-strength', 'target-lats')).toBe(
			false
		);
	});
});
