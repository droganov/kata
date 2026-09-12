import { describe, expect, it } from 'vitest';

import type { SourceProgram, SourceSlot } from './source-catalog.ts';

import {
	catalogWithProgram,
	PROGRAM_ID,
	programBlocks,
	sourceProgram
} from '../../../test/table-fixtures.ts';
import { tablesOf } from './convert.ts';

const CERVICAL = '01a0889d-3845-7b73-adc5-6b00a88f5523';
const CARDIO = '01a0889d-3848-7b73-adc5-6b00a88f5526';

const tables = tablesOf(catalogWithProgram(), programBlocks());
const withProgram = (change: Partial<SourceProgram>): ReturnType<typeof tablesOf> =>
	tablesOf(catalogWithProgram({ ...sourceProgram(), ...change }), programBlocks());
const unpairedWith = (sections: SourceProgram['sections']): ReturnType<typeof tablesOf> =>
	withProgram({ pairings: [], sections });
const sectionsWith = (
	slug: string,
	slots: readonly Omit<SourceSlot, 'kind' | 'label'>[]
): SourceProgram['sections'] =>
	sourceProgram().sections.map((section) =>
		section.slug === slug
			? {
					...section,
					slots: slots.map((slot) => ({ kind: 'pool', label: 'Кандидаты', ...slot }))
				}
			: section
	);

describe('программа', () => {
	it('несёт владельца, название источника дословно и противопоказания', () => {
		expect(tables.program).toEqual([
			{
				free_weight_kg_max: 10,
				id: PROGRAM_ID,
				no_axial_load: true,
				no_lumbar_extension: true,
				no_lumbar_flexion: false,
				person_id: 'person-1',
				session_budget_min: 70,
				sessions_per_week: 3,
				slug: 'pins_and_draw',
				title: 'Программа: БАЗА + ПУЛ'
			}
		]);
		expect(tables.person).toEqual([{ id: 'person-1', nickname: 'Sergei' }]);
	});

	it('несёт цели с приоритетом, плоскости бедра и занятия вне зала', () => {
		expect(tables.program_goal.map((row) => [row.priority, row.ord])).toEqual([
			['primary', 1],
			['secondary', 1]
		]);
		expect(tables.goal.map((row) => row.name)).toEqual(['Ягодицы', 'Сила']);
		expect(tables.program_hip_plane).toEqual([
			{ hip_plane: 'flexion', ord: 1, program_id: PROGRAM_ID }
		]);
		expect(tables.program_outside_gym.map((row) => [row.key, row.intensity])).toEqual([
			['walking', 'moderate'],
			['mobility_home', null]
		]);
	});

	it('несёт тайминг в секундах, прогрессию и недельный объём по анатомической группе', () => {
		expect(tables.program_timing.find((row) => row.key === 'warmup_general')?.sec).toBe(300);
		expect(tables.program_timing).toHaveLength(6);
		expect(tables.program_progression.map((row) => [row.key, row.text])).toEqual([
			['pinned', 'закрепления'],
			['drawn', 'добор'],
			['isometric', 'изометрия'],
			['stop_rule', 'стоп']
		]);
		expect(tables.program_volume).toEqual([
			{
				max_sets: 14,
				min_sets: 6,
				program_id: PROGRAM_ID,
				target_group_id: tables.target_group.find((row) => row.slug === 'back')?.id
			}
		]);
	});

	it('не заводит общий разогрев, когда его нет в тайминге', () => {
		const { holdRestSec, restSecAccessory, restSecStrength, transitionSec, workSecPerSet } =
			sourceProgram().timing;
		const timing = {
			holdRestSec,
			restSecAccessory,
			restSecStrength,
			transitionSec,
			workSecPerSet
		};
		expect(withProgram({ timing }).program_timing).toHaveLength(5);
	});

	it('бросает, когда Блоки программы не объявлены', () => {
		expect(() => tablesOf(catalogWithProgram(), {})).toThrow(PROGRAM_ID);
	});

	it('бросает, когда анатомической группы объёма нет', () => {
		expect(() => withProgram({ volumes: [{ group: 'legs', max: 1, min: 1 }] })).toThrow('legs');
	});
});

describe('блоки', () => {
	it('берут id, slug, mode и порядок из sections[], имя объявления или title и бюджет файла', () => {
		expect(
			tables.block.map((row) => [
				row.id,
				row.slug,
				row.ord,
				row.name,
				row.modality,
				row.budget_sec
			])
		).toEqual([
			['section-cardio', 'warmup_cardio', 1, 'Разогрев', 'cardio', null],
			['section-warmup', 'warmup', 2, 'Разминка', 'dynamic', 420],
			['section-strength', 'strength', 3, 'Силовой блок', 'loaded', null]
		]);
	});

	it('бросают, когда файла каталога Блока нет', () => {
		const sections = sourceProgram().sections.map((section) => ({ ...section, bank: 'ghost' }));
		expect(() => withProgram({ sections })).toThrow('warmup_cardio');
	});
});

describe('закрепления', () => {
	it('выводят Мишень из slots[], чьи кандидаты лежат под одной Мишенью, с числом и длительностью', () => {
		expect(tables.block_pin_target).toEqual([
			{ block_id: 'section-cardio', ord: 1, pick: 1, sec_each: 260, target_id: CARDIO },
			{ block_id: 'section-warmup', ord: 1, pick: 1, sec_each: 20, target_id: CERVICAL }
		]);
	});

	it('берут в slots[] без pick все кандидаты и оставляют длительность пустой', () => {
		const sections = sectionsWith('warmup', [{ exercises: ['ex-neck-1'], id: 'slot-neck' }]);
		expect(unpairedWith(sections).block_pin_target[1]).toMatchObject({
			pick: 1,
			sec_each: null
		});
	});

	it('закрепляют Группы мышц по объявлению Блока', () => {
		expect(tables.block_pin_group).toEqual([
			{ block_id: 'section-strength', muscle_group_id: 'group-back', ord: 1, pick: 1 }
		]);
	});

	it('бросают, когда кандидаты slots[] лежат в разных Мишенях или их нет', () => {
		const mixed = sectionsWith('warmup', [
			{ exercises: ['ex-neck-1', 'ex-row-1'], id: 'slot-mixed' }
		]);
		expect(() => unpairedWith(mixed)).toThrow('slot-mixed');
		const empty = sectionsWith('warmup', [{ exercises: [], id: 'slot-empty' }]);
		expect(() => unpairedWith(empty)).toThrow('slot-empty');
	});

	it('бросают, когда кандидата slots[] нет в каталоге', () => {
		const sections = sectionsWith('warmup', [{ exercises: ['ghost'], id: 'slot-ghost' }]);
		expect(() => unpairedWith(sections)).toThrow('ghost');
	});

	it('бросают, когда объявленной Группы мышц нет', () => {
		const blocks = programBlocks();
		const declared = {
			[PROGRAM_ID]: {
				...blocks[PROGRAM_ID]!,
				blocks: { strength: { pinnedGroups: [{ pick: 1, slug: 'legs' }] } }
			}
		};
		expect(() => tablesOf(catalogWithProgram(), declared)).toThrow('legs');
	});
});

describe('добор', () => {
	it('записан у объявленного Блока с общим sec_each его slots[]', () => {
		expect(tables.block_draw).toEqual([
			{
				block_id: 'section-strength',
				count: 1,
				level: 'muscle_group',
				pick_each: 1,
				sec_each: 60
			}
		]);
	});

	it('оставляет sec_each пустым, когда его нет, и молчит без добора', () => {
		const sections = sectionsWith('strength', [{ exercises: ['ex-lats-1'], id: 'slot-base' }]);
		expect(unpairedWith(sections).block_draw[0]?.sec_each).toBeNull();
		const declared = {
			[PROGRAM_ID]: { blocks: { strength: { pinnedGroups: [] } }, slug: 's' }
		};
		expect(tablesOf(catalogWithProgram(), declared).block_draw).toEqual([]);
	});

	it('бросает, когда sec_each Блока расходятся', () => {
		const sections = sectionsWith('strength', [
			{ exercises: ['ex-lats-1'], id: 'a', secEach: 60 },
			{ exercises: ['ex-row-1'], id: 'b', secEach: 90 }
		]);
		expect(() => unpairedWith(sections)).toThrow('strength');
	});
});

describe('правила и исключения', () => {
	it('несут zones[].rule с Группой мышц и rules[] без неё', () => {
		const catalog = catalogWithProgram();
		const files = catalog.files.map((file) =>
			file.slug === 'strength' ? { ...file, rules: ['общее правило'] } : file
		);
		expect(
			tablesOf({ ...catalog, files }, programBlocks()).block_rule.map((row) => [
				row.block_id,
				row.muscle_group_id,
				row.ord,
				row.text
			])
		).toEqual([
			['section-strength', 'group-back', 1, 'амплитуда до нейтрали'],
			['section-strength', null, 2, 'общее правило']
		]);
	});

	it('несут исключённые движения с причиной', () => {
		expect(
			tables.block_excluded.map((row) => [row.block_id, row.ord, row.name, row.reason])
		).toEqual([['section-strength', 1, 'Становая тяга', 'наклон под нагрузкой']]);
	});
});

describe('пары растяжки под нагрузку дня', () => {
	it('ведут от Группы мышц slots[] к Мишени упражнения пары в его Блоке', () => {
		expect(tables.block_pair).toEqual([
			{ block_id: 'section-warmup', then_target_id: CERVICAL, when_group_id: 'group-neck' }
		]);
	});

	it('берут Группу мышц большинства кандидатов slots[], мимо системных Мишеней', () => {
		const sections = sectionsWith('strength', [
			{ exercises: ['ex-lats-1'], id: 'slot-base' },
			{
				exercises: ['ex-row-1', 'ex-lats-1', 'ex-neck-2', 'ex-cardio-1'],
				id: 'slot-pool',
				pick: 1
			}
		]);
		expect(withProgram({ sections }).block_pair[0]?.when_group_id).toBe('group-back');
	});

	it('не повторяют одинаковую пару', () => {
		const pairings = [
			{ exercises: ['ex-neck-1', 'ex-neck-1'], slot: 'slot-pool' },
			{ exercises: ['ex-neck-1'], slot: 'slot-pool' }
		];
		expect(withProgram({ pairings }).block_pair).toHaveLength(1);
	});

	it('бросают на неизвестном slots[].id, на кандидатах без Групп мышц и на упражнении вне Блоков', () => {
		expect(() => withProgram({ pairings: [{ exercises: [], slot: 'ghost' }] })).toThrow(
			'ghost'
		);
		const cardioOnly = sectionsWith('strength', [
			{ exercises: ['ex-cardio-1'], id: 'slot-pool' }
		]);
		expect(() =>
			withProgram({ pairings: [{ exercises: [], slot: 'slot-pool' }], sections: cardioOnly })
		).toThrow('slot-pool');
		const rowOnly = sectionsWith('strength', [{ exercises: ['ex-row-1'], id: 'slot-pool' }]);
		expect(() =>
			withProgram({
				pairings: [{ exercises: ['ex-neck-2'], slot: 'slot-pool' }],
				sections: rowOnly
			})
		).toThrow('ex-neck-2');
	});
});
