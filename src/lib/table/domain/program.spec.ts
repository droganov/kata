import { describe, expect, it } from 'vitest';

import type { SourceProgramBlocks } from './program-blocks.ts';
import type { SourceProgram } from './source-catalog.ts';

import { programTablesOf } from './program.ts';

const PROGRAM: SourceProgram = {
	contraindications: {
		axialLoad: true,
		freeWeightKgMax: 10,
		lumbarExtension: false,
		lumbarFlexion: true
	},
	id: 'program-1',
	person: 'person-1',
	sessionBudgetMin: 70,
	sessionsPerWeek: 3
};

const BLOCKS: SourceProgramBlocks = {
	blocks: [
		{
			modality: 'dynamic',
			name: 'Разминка',
			pinnedGroups: [],
			pinnedTargets: [{ pick: 4, slug: 'cervical_spine' }]
		},
		{
			draw: { count: 2, level: 'muscle_group', pickEach: 1 },
			modality: 'loaded',
			name: 'Силовой',
			pinnedGroups: [
				{ pick: 1, slug: 'back' },
				{ pick: 1, slug: 'neck' }
			],
			pinnedTargets: []
		}
	],
	slug: 'pins_and_draw',
	title: 'Закрепления и добор'
};

const IDS = {
	groupIdBySlug: new Map([
		['back', 'group-back'],
		['neck', 'group-neck']
	]),
	targetIdBySlug: new Map([['cervical_spine', 'target-cervical']])
};

const tables = programTablesOf([PROGRAM], { 'program-1': BLOCKS }, IDS);
const blockId = (name: string): unknown => tables.block.find((row) => row.name === name)?.id;

describe('программа', () => {
	it('несёт владельца, название и противопоказания источника', () => {
		expect(tables.program).toEqual([
			{
				free_weight_kg_max: 10,
				id: 'program-1',
				no_axial_load: true,
				no_lumbar_extension: false,
				no_lumbar_flexion: true,
				person_id: 'person-1',
				session_budget_min: 70,
				sessions_per_week: 3,
				slug: 'pins_and_draw',
				title: 'Закрепления и добор'
			}
		]);
	});

	it('бросает, когда Блоки программы не объявлены', () => {
		expect(() => programTablesOf([PROGRAM], {}, IDS)).toThrow('program-1');
	});
});

describe('блоки', () => {
	it('нумеруются с единицы в объявленном порядке и несут режим', () => {
		expect(
			tables.block.map((row) => [row.program_id, row.ord, row.name, row.modality])
		).toEqual([
			['program-1', 1, 'Разминка', 'dynamic'],
			['program-1', 2, 'Силовой', 'loaded']
		]);
	});

	it('получают устойчивый идентификатор, разный у разных блоков', () => {
		const again = programTablesOf([PROGRAM], { 'program-1': BLOCKS }, IDS);
		expect(again.block.map((row) => row.id)).toEqual(tables.block.map((row) => row.id));
		expect(blockId('Разминка')).not.toBe(blockId('Силовой'));
	});
});

describe('закрепления', () => {
	it('закрепляют мишени по порядку с числом упражнений', () => {
		expect(tables.block_pin_target).toEqual([
			{ block_id: blockId('Разминка'), ord: 1, pick: 4, target_id: 'target-cervical' }
		]);
	});

	it('закрепляют группы мышц по порядку с числом упражнений', () => {
		expect(tables.block_pin_group).toEqual([
			{ block_id: blockId('Силовой'), muscle_group_id: 'group-back', ord: 1, pick: 1 },
			{ block_id: blockId('Силовой'), muscle_group_id: 'group-neck', ord: 2, pick: 1 }
		]);
	});

	it('бросают, когда группы мышц нет в каталоге', () => {
		const keys = { ...IDS, groupIdBySlug: new Map() };
		expect(() => programTablesOf([PROGRAM], { 'program-1': BLOCKS }, keys)).toThrow('back');
	});

	it('бросают, когда мишени нет в каталоге', () => {
		const keys = { ...IDS, targetIdBySlug: new Map() };
		expect(() => programTablesOf([PROGRAM], { 'program-1': BLOCKS }, keys)).toThrow(
			'cervical_spine'
		);
	});
});

describe('добор', () => {
	it('записан строкой только у блока, который добирает', () => {
		expect(tables.block_draw).toEqual([
			{ block_id: blockId('Силовой'), count: 2, level: 'muscle_group', pick_each: 1 }
		]);
	});
});
