import { describe, expect, it } from 'vitest';

import type { Block, Program } from './program.ts';
import type { Session, SessionItem } from './session.ts';

import {
	CATALOG,
	FORBIDDEN_EXERCISES,
	PROGRAM,
	STRETCH_PAIRS
} from '../../../test/session-fixtures.ts';
import { BUNDLED_TABLES } from '../infrastructure/bundled-tables.ts';
import { createTableGateways } from '../infrastructure/table-gateways.ts';
import { sessionOf } from './assembly.ts';

const SEEDS = Array.from({ length: 200 }, (_item, at) => at);
const SEED = 7;
const PINNED_GROUPS = ['group-glutes', 'group-chest'];

const byText = (first: string, second: string): number => first.localeCompare(second);

const sessions = SEEDS.map((seed) => sessionOf(PROGRAM, CATALOG, seed));

const itemsOf = (session: Session, block: string): readonly SessionItem[] =>
	session.items.filter((item) => item.block === block);
const groupOf = (target: string): string =>
	CATALOG.targets.find((row) => row.id === target)?.muscleGroup ?? 'no-group';
const exerciseOf = (id: string): (typeof CATALOG.exercises)[number] | undefined =>
	CATALOG.exercises.find((exercise) => exercise.id === id);
const withBlocks = (...blocks: readonly Block[]): Program => ({ ...PROGRAM, blocks });
const blockOf = (id: string): Block => PROGRAM.blocks.find((block) => block.id === id)!;
const takenAcrossSeeds = (program: Program): ReadonlySet<string> =>
	new Set(
		SEEDS.flatMap((seed) =>
			sessionOf(program, CATALOG, seed).items.map((item) => item.exercise)
		)
	);
const loadedBlock = (overrides: Partial<Block>): Block => ({
	id: 'block-loaded',
	modality: 'loaded',
	name: 'Силовой',
	ord: 1,
	pairs: [],
	pinnedGroups: [],
	pinnedTargets: [],
	...overrides
});

describe('sessionOf: Закреплённое', () => {
	it('Закреплённые Группы мышц присутствуют в каждом Занятии без исключений', () => {
		for (const session of sessions) {
			const strength = itemsOf(session, 'block-strength').map((item) => groupOf(item.target));
			const stretch = itemsOf(session, 'block-stretch').map((item) => groupOf(item.target));
			expect(strength).toEqual(expect.arrayContaining(PINNED_GROUPS));
			expect(stretch).toContain('group-glutes');
		}
	});

	it('внутри Закреплённой Группы мышц выбирает Мишень случайно, затем Упражнение внутри Мишени', () => {
		const gluteTargets = new Set(
			sessions.map((session) => itemsOf(session, 'block-strength')[0]?.target)
		);
		const chestExercises = new Set(
			sessions.map((session) => itemsOf(session, 'block-strength')[1]?.exercise)
		);
		expect(gluteTargets).toEqual(new Set(['target-glute-med', 'target-glutes']));
		expect(chestExercises).toEqual(new Set(['ex-fly', 'ex-press']));
		const shownItems = sessions.flatMap((session) => session.items);
		for (const item of shownItems)
			expect(exerciseOf(item.exercise)?.catalogTarget).toBe(item.target);
	});

	it('берёт из Закреплённой Мишени столько Упражнений, сколько велено, в Режиме Блока', () => {
		for (const session of sessions) {
			const warmup = itemsOf(session, 'block-warmup');
			expect(warmup.map((item) => item.exercise).toSorted(byText)).toEqual([
				'ex-neck-roll',
				'ex-neck-tilt'
			]);
			for (const item of warmup) expect(item.target).toBe('target-cervical');
		}
	});

	it('закрепляет системную Мишень вне Групп мышц', () => {
		expect(
			itemsOf(sessionOf(PROGRAM, CATALOG, SEED), 'block-cardio').map((item) => [
				item.target,
				item.exercise
			])
		).toEqual([['target-cardio', 'ex-bike']]);
	});

	it('не даёт позиций Блоку, в Режиме которого нет Упражнений', () => {
		const empty = loadedBlock({
			modality: 'calisthenic',
			pinnedGroups: [{ id: 'group-back', ord: 1, pick: 1 }]
		});
		expect(sessionOf(withBlocks(empty), CATALOG, SEED).items).toEqual([]);
	});
});

describe('sessionOf: добор', () => {
	it('добирает ровно count Групп мышц и только из незакреплённых', () => {
		const drawnGroups = new Set<string | undefined>();
		for (const session of sessions) {
			const drawn = itemsOf(session, 'block-strength')
				.slice(PINNED_GROUPS.length)
				.map((item) => groupOf(item.target));
			expect(drawn).toHaveLength(2);
			expect(new Set(drawn).size).toBe(2);
			for (const group of drawn) {
				expect(PINNED_GROUPS).not.toContain(group);
				drawnGroups.add(group);
			}
		}
		expect(drawnGroups).toEqual(new Set(['group-back', 'group-legs', 'group-neck']));
	});

	it('добирает ровно count Мишеней, когда добор идёт по Мишеням, мимо закреплённого', () => {
		const block = loadedBlock({
			draw: { count: 2, level: 'target', pickEach: 1 },
			pinnedGroups: [{ id: 'group-glutes', ord: 1, pick: 1 }],
			pinnedTargets: [{ id: 'target-lats', ord: 1, pick: 1 }]
		});
		for (const seed of SEEDS) {
			const drawn = sessionOf(withBlocks(block), CATALOG, seed).items.slice(2);
			expect(drawn).toHaveLength(2);
			expect(new Set(drawn.map((item) => item.target)).size).toBe(2);
			for (const item of drawn) {
				expect(item.target).not.toBe('target-lats');
				expect(groupOf(item.target)).not.toBe('group-glutes');
			}
		}
	});

	it('добирая Группы мышц, обходит Группу мышц Закреплённой Мишени', () => {
		const block = loadedBlock({
			draw: { count: 3, level: 'muscle_group', pickEach: 1 },
			pinnedTargets: [{ id: 'target-lats', ord: 1, pick: 1 }]
		});
		for (const seed of SEEDS) {
			const drawn = sessionOf(withBlocks(block), CATALOG, seed)
				.items.slice(1)
				.map((item) => groupOf(item.target));
			expect(drawn).toHaveLength(3);
			expect(drawn).not.toContain('group-back');
		}
	});

	it('без добора отдаёт только Закреплённое', () => {
		const block = loadedBlock({
			pinnedGroups: [{ id: 'group-glutes', ord: 1, pick: 1 }],
			pinnedTargets: [{ id: 'target-lats', ord: 1, pick: 1 }]
		});
		expect(sessionOf(withBlocks(block), CATALOG, SEED).items).toHaveLength(2);
	});
});

describe('sessionOf: противопоказания', () => {
	it('Упражнение, запрещённое противопоказаниями, не появляется ни при каком зерне', () => {
		const taken = takenAcrossSeeds(PROGRAM);
		for (const exercise of FORBIDDEN_EXERCISES) expect(taken).not.toContain(exercise);
		expect(taken).toContain('ex-goblet-squat');
	});

	it('Программа без противопоказаний допускает те же Упражнения', () => {
		const taken = takenAcrossSeeds({
			...PROGRAM,
			contraindications: {
				noAxialLoad: false,
				noLumbarExtension: false,
				noLumbarFlexion: false
			}
		});
		for (const exercise of FORBIDDEN_EXERCISES) expect(taken).toContain(exercise);
	});

	it('фильтрует до отбора: Мишень и Группа мышц, где всё запрещено, не оставляют дыры', () => {
		const back = loadedBlock({ pinnedGroups: [{ id: 'group-back', ord: 1, pick: 1 }] });
		for (const seed of SEEDS) {
			expect(sessionOf(withBlocks(back), CATALOG, seed).items).toHaveLength(1);
			expect(itemsOf(sessions[seed]!, 'block-strength')).toHaveLength(4);
		}
	});
});

describe('sessionOf: порядок', () => {
	it('идёт по Блокам в порядке Программы', () => {
		for (const session of sessions)
			expect([...new Set(session.items.map((item) => item.block))]).toEqual([
				'block-cardio',
				'block-warmup',
				'block-strength',
				'block-stretch'
			]);
	});

	it('внутри Блока ставит Закреплённые Группы мышц по объявленному порядку перед Добранными', () => {
		for (const session of sessions) {
			const groups = itemsOf(session, 'block-strength').map((item) => groupOf(item.target));
			expect(groups.slice(0, 2)).toEqual(PINNED_GROUPS);
		}
	});

	it('внутри Блока ставит Закреплённые Мишени перед Закреплёнными Группами мышц', () => {
		const block = loadedBlock({
			draw: { count: 1, level: 'muscle_group', pickEach: 1 },
			pinnedGroups: [{ id: 'group-glutes', ord: 1, pick: 1 }],
			pinnedTargets: [{ id: 'target-lats', ord: 1, pick: 1 }]
		});
		for (const seed of SEEDS) {
			const items = sessionOf(withBlocks(block), CATALOG, seed).items;
			expect(items.map((item) => groupOf(item.target)).slice(0, 2)).toEqual([
				'group-back',
				'group-glutes'
			]);
			expect(items).toHaveLength(3);
			expect(['group-back', 'group-glutes']).not.toContain(groupOf(items[2]!.target));
		}
	});

	it('нумерует позиции подряд с единицы через всё Занятие', () => {
		for (const session of sessions)
			expect(session.items.map((item) => item.ord)).toEqual(
				session.items.map((_item, at) => at + 1)
			);
	});
});

describe('sessionOf: зерно', () => {
	it('на одинаковом зерне даёт одинаковое Занятие', () => {
		expect(sessionOf(PROGRAM, CATALOG, SEED)).toEqual(sessionOf(PROGRAM, CATALOG, SEED));
	});

	it('на разных зёрнах даёт разные Занятия', () => {
		const distinct = new Set(sessions.map((session) => JSON.stringify(session.items)));
		expect(distinct.size).toBeGreaterThan(SEEDS.length / 10);
	});

	it('сохраняет зерно вместе с Занятием', () => {
		expect(sessions.map((session) => session.seed)).toEqual(SEEDS);
	});
});

describe('sessionOf: без повторов', () => {
	it('одно Упражнение не попадает в Занятие дважды', () => {
		const chest = { pinnedGroups: [{ id: 'group-chest', ord: 1, pick: 2 }] };
		const program = withBlocks(
			loadedBlock({ ...chest, id: 'block-first' }),
			loadedBlock({ ...chest, id: 'block-second', ord: 2 })
		);
		for (const seed of SEEDS) {
			const items = sessionOf(program, CATALOG, seed).items;
			expect(items.map((item) => item.exercise).toSorted(byText)).toEqual([
				'ex-fly',
				'ex-press'
			]);
		}
	});
});

describe('sessionOf: Растяжка под нагрузку дня', () => {
	it('добавляет через block_pair по одной Мишени под каждую нагруженную сегодня Группу мышц', () => {
		const pairedGroups = new Set(STRETCH_PAIRS.map((pair) => pair.whenGroup));
		for (const session of sessions) {
			const loaded = itemsOf(session, 'block-strength').map((item) => groupOf(item.target));
			const paired = itemsOf(session, 'block-stretch')
				.slice(1)
				.map(
					(item) =>
						STRETCH_PAIRS.find(
							(pair) =>
								pair.thenTarget === item.target && loaded.includes(pair.whenGroup)
						)?.whenGroup ?? 'unpaired'
				);
			expect(paired.toSorted(byText)).toEqual(
				loaded.filter((group) => pairedGroups.has(group)).toSorted(byText)
			);
		}
	});

	it('из нескольких строк block_pair одной Группы мышц берёт одну случайную', () => {
		const legTargets = new Set(
			sessions.flatMap((session) =>
				itemsOf(session, 'block-stretch')
					.slice(1)
					.map((item) => item.target)
					.filter((target) => groupOf(target) === 'group-legs')
			)
		);
		expect(legTargets).toEqual(new Set(['target-hamstrings', 'target-quads']));
	});

	it('не добавляет Мишень под Группу мышц, которую сегодня не нагружали', () => {
		const stretch = { ...blockOf('block-stretch'), ord: 2, pinnedGroups: [] };
		const program = withBlocks(blockOf('block-warmup'), {
			...stretch,
			pairs: [{ thenTarget: 'target-glutes', whenGroup: 'group-neck' }]
		});
		expect(sessionOf(program, CATALOG, SEED).items.map((item) => item.block)).toEqual([
			'block-warmup',
			'block-warmup'
		]);
	});
});

describe('sessionOf: Доза', () => {
	it('снимает Дозу с Упражнения', () => {
		for (const item of sessionOf(PROGRAM, CATALOG, SEED).items)
			expect(item.dose).toBe(exerciseOf(item.exercise)?.dose);
	});
});

describe('sessionOf на боевых таблицах', () => {
	const gateways = createTableGateways(BUNDLED_TABLES);
	const [program] = gateways.programs.readPrograms();
	const catalog = gateways.catalog.readCatalog();
	const warmup = program!.blocks.find((block) => block.name === 'Разминка')!;
	const combat = SEEDS.slice(0, 50).map((seed) => sessionOf(program!, catalog, seed));

	it('Разминка отдаёт все одиннадцать суставов', () => {
		const joints = new Set(warmup.pinnedTargets.map((pin) => pin.id));
		expect(joints.size).toBe(11);
		for (const session of combat)
			expect(new Set(itemsOf(session, warmup.id).map((item) => item.target))).toEqual(joints);
	});

	it('ставит Закреплённые Группы мышц каждого Блока в каждое Занятие', () => {
		const groupOfTarget = new Map(
			catalog.targets.map((target) => [target.id, target.muscleGroup])
		);
		for (const session of combat)
			for (const block of program!.blocks) {
				const groups = itemsOf(session, block.id).map((item) =>
					groupOfTarget.get(item.target)
				);
				expect(groups).toEqual(
					expect.arrayContaining(block.pinnedGroups.map((pin) => pin.id))
				);
			}
	});

	it('не повторяет Упражнение внутри Занятия', () => {
		for (const session of combat)
			expect(new Set(session.items.map((item) => item.exercise)).size).toBe(
				session.items.length
			);
	});
});
