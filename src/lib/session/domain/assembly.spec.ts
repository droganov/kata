import { describe, expect, it } from 'vitest';

import type { Performed } from './novelty.ts';
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
import { noveltyOf } from './novelty.ts';

const SEEDS = Array.from({ length: 200 }, (_item, at) => at);
const SEED = 7;
const PINNED_GROUPS = ['group-glutes', 'group-chest'];
const MANY_SEEDS = Array.from({ length: 2000 }, (_item, at) => at);
const NOW = new Date('2026-09-26T09:00:00Z');
const YESTERDAY = '2026-09-25T09:00:00Z';

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

const shareOf = (program: Program, history: readonly Performed[], exercise: string): number =>
	MANY_SEEDS.filter((seed) =>
		sessionOf(program, CATALOG, seed, noveltyOf(history, NOW)).items.some(
			(item) => item.exercise === exercise
		)
	).length / MANY_SEEDS.length;

describe('sessionOf: вес новизны', () => {
	const chestOnly = withBlocks(
		loadedBlock({ pinnedGroups: [{ id: 'group-chest', ord: 1, pick: 1 }] })
	);

	it('выполненное вчера выпадает существенно реже нового, но выпадает', () => {
		const share = shareOf(chestOnly, [{ doneAt: YESTERDAY, exercise: 'ex-press' }], 'ex-press');
		expect(share).toBeLessThan(0.1);
		expect(share).toBeGreaterThan(0);
	});

	it.each([
		['сегодня', '2026-09-26T09:00:00Z', 0.02 / 1.02],
		['вчера', YESTERDAY, 1 / 22],
		['десять с половиной дней назад', '2026-09-15T21:00:00Z', 1 / 3],
		['двадцать один день назад', '2026-09-05T09:00:00Z', 1 / 2],
		['сорок дней назад', '2026-08-17T09:00:00Z', 1 / 2]
	])('весит выполненное %s как max(d / 21, 0.02)', (_case, doneAt, expected) => {
		const share = shareOf(chestOnly, [{ doneAt, exercise: 'ex-press' }], 'ex-press');
		expect(Math.abs(share - expected)).toBeLessThan(0.03);
	});

	it('считает вес по самому свежему выполнению Упражнения', () => {
		const history = [
			{ doneAt: '2026-09-05T09:00:00Z', exercise: 'ex-press' },
			{ doneAt: YESTERDAY, exercise: 'ex-press' },
			{ doneAt: '2026-09-12T09:00:00Z', exercise: 'ex-press' }
		];
		expect(shareOf(chestOnly, history, 'ex-press')).toBeLessThan(0.1);
	});

	it('выполненное сегодня остаётся достижимым: вес не падает ниже 0.02', () => {
		const share = shareOf(
			chestOnly,
			[{ doneAt: NOW.toISOString(), exercise: 'ex-press' }],
			'ex-press'
		);
		expect(share).toBeGreaterThan(0.01);
		expect(share).toBeLessThan(0.03);
	});

	it('Упражнению, которого нет в Истории, даёт полный вес', () => {
		const history = [{ doneAt: '2026-09-15T21:00:00Z', exercise: 'ex-fly' }];
		const share = shareOf(chestOnly, history, 'ex-press');
		expect(Math.abs(share - 2 / 3)).toBeLessThan(0.03);
	});

	it('Мишень внутри Группы мышц весит по самому свежему своему Упражнению', () => {
		const glutes = withBlocks(
			loadedBlock({ pinnedGroups: [{ id: 'group-glutes', ord: 1, pick: 1 }] })
		);
		const history = [{ doneAt: YESTERDAY, exercise: 'ex-bridge' }];
		expect(shareOf(glutes, history, 'ex-bridge')).toBeLessThan(0.1);
		expect(shareOf(glutes, history, 'ex-abduction')).toBeGreaterThan(0.9);
	});

	it('добираемая Группа мышц весит по самому свежему своему Упражнению, а не в среднем', () => {
		const drawOne = withBlocks(
			loadedBlock({ draw: { count: 1, level: 'muscle_group', pickEach: 1 } })
		);
		const history = [{ doneAt: YESTERDAY, exercise: 'ex-leg-press' }];
		const legs = MANY_SEEDS.filter((seed) =>
			sessionOf(drawOne, CATALOG, seed, noveltyOf(history, NOW)).items.some(
				(item) => groupOf(item.target) === 'group-legs'
			)
		).length;
		expect(legs / MANY_SEEDS.length).toBeLessThan(0.05);
		expect(legs).toBeGreaterThan(0);
	});

	it('не учитывает выполненное в другом Режиме той же Мишени', () => {
		const strength = withBlocks(blockOf('block-strength'));
		const history = [{ doneAt: YESTERDAY, exercise: 'ex-pigeon' }];
		for (const seed of SEEDS)
			expect(sessionOf(strength, CATALOG, seed, noveltyOf(history, NOW))).toEqual(
				sessionOf(strength, CATALOG, seed)
			);
	});

	it('Закреплённое попадает в Занятие всегда, даже когда История покрывает весь каталог', () => {
		const everything = CATALOG.exercises.map((exercise) => ({
			doneAt: NOW.toISOString(),
			exercise: exercise.id
		}));
		for (const seed of SEEDS) {
			const session = sessionOf(PROGRAM, CATALOG, seed, noveltyOf(everything, NOW));
			const strength = itemsOf(session, 'block-strength').map((item) => groupOf(item.target));
			expect(strength).toEqual(expect.arrayContaining(PINNED_GROUPS));
			expect(itemsOf(session, 'block-stretch').map((item) => groupOf(item.target))).toContain(
				'group-glutes'
			);
			expect(new Set(session.items.map((item) => item.block))).toEqual(
				new Set(PROGRAM.blocks.map((block) => block.id))
			);
		}
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

	it('при Истории, покрывающей весь каталог, Мишень «шейный отдел» отдаёт все четыре Упражнения', () => {
		const everything = noveltyOf(
			catalog.exercises.map((exercise) => ({
				doneAt: NOW.toISOString(),
				exercise: exercise.id
			})),
			NOW
		);
		const cervical = catalog.targets.find((target) => target.slug === 'cervical_spine')!;
		const cervicalExercises = catalog.exercises
			.filter((exercise) => exercise.catalogTarget === cervical.id)
			.map((exercise) => exercise.id)
			.toSorted(byText);
		expect(cervicalExercises).toHaveLength(4);
		for (const seed of SEEDS.slice(0, 50)) {
			const session = sessionOf(program!, catalog, seed, everything);
			expect(
				itemsOf(session, warmup.id)
					.filter((item) => item.target === cervical.id)
					.map((item) => item.exercise)
					.toSorted(byText)
			).toEqual(cervicalExercises);
			expect(new Set(session.items.map((item) => item.block))).toEqual(
				new Set(program!.blocks.map((block) => block.id))
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
