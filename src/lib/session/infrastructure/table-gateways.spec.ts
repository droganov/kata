import { describe, expect, it } from 'vitest';

import type { TableRow } from './bundled-tables.ts';

import { createTableGateways } from './table-gateways.ts';

const TABLES: Record<string, readonly TableRow[]> = {
	block: [
		{ id: 'b-warmup', modality: 'dynamic', name: 'Разминка', ord: 1, program_id: 'p1' },
		{ id: 'b-strength', modality: 'loaded', name: 'Силовой', ord: 2, program_id: 'p1' },
		{ id: 'b-alien', modality: 'loaded', name: 'Чужой', ord: 1, program_id: 'p2' }
	],
	block_draw: [{ block_id: 'b-strength', count: 2, level: 'muscle_group', pick_each: 1 }],
	block_pair: [
		{ block_id: 'b-strength', then_target_id: 't-cervical', when_group_id: 'g-glutes' }
	],
	block_pin_group: [{ block_id: 'b-strength', muscle_group_id: 'g-glutes', ord: 1, pick: 1 }],
	block_pin_target: [{ block_id: 'b-warmup', ord: 1, pick: 4, target_id: 't-cervical' }],
	equipment: [{ id: 'q-body', name: 'Тело' }],
	exercise: [
		{
			axial: false,
			catalog_target_id: 't-cervical',
			dose: '2×10',
			free_weight: false,
			id: 'e1',
			kg_max: null,
			lumbar_ext: false,
			lumbar_flex: false,
			modality: 'dynamic',
			name: 'Круги головой',
			note: 'медленно',
			slug: 'neck_roll'
		},
		{
			axial: true,
			catalog_target_id: 't-cardio',
			dose: '5 мин',
			free_weight: true,
			id: 'e2',
			kg_max: 16,
			lumbar_ext: true,
			lumbar_flex: true,
			modality: 'cardio',
			name: 'Велотренажёр',
			note: null,
			slug: 'bike'
		}
	],
	exercise_equipment: [{ equipment_id: 'q-body', exercise_id: 'e1', role: 'main' }],
	exercise_target: [{ exercise_id: 'e1', role: 'primary', target_id: 't-cervical' }],
	muscle_group: [{ id: 'g-glutes', name: 'Ягодичные', ord: 8, slug: 'glutes' }],
	oracle: [
		{ id: 'o2', ord: 1, predicate: 'Возврат плавный', step_id: 's2' },
		{ id: 'o1', ord: 1, predicate: 'Плечи опущены', step_id: 's1' }
	],
	oracle_line: [
		{ id: 'l2', oracle_id: 'o1', ord: 2, side: 'counter', text: 'рывок' },
		{ id: 'l1', oracle_id: 'o1', ord: 1, side: 'model', text: 'плавно' }
	],
	program: [
		{
			free_weight_kg_max: 10,
			id: 'p1',
			no_axial_load: true,
			no_lumbar_extension: false,
			no_lumbar_flexion: true,
			slug: 'pins_and_draw',
			title: 'Закрепления и добор'
		}
	],
	step: [
		{ exercise_id: 'e1', id: 's2', ord: 2, title: 'Возврат' },
		{ exercise_id: 'e1', id: 's3', ord: 3, title: 'Пауза' },
		{ exercise_id: 'e1', id: 's1', ord: 1, title: 'Наклон' }
	],
	step_target: [
		{ step_id: 's1', target_id: 't-cervical' },
		{ step_id: 's1', target_id: 't-ghost' }
	],
	target: [
		{
			id: 't-cervical',
			kind: 'joint',
			muscle_group_id: 'g-neck',
			name: 'Шейный отдел',
			slug: 'cervical_spine'
		},
		{
			id: 't-cardio',
			kind: 'system',
			muscle_group_id: null,
			name: 'Система',
			slug: 'cardiorespiratory'
		}
	]
};

const [PROGRAM_ROW] = TABLES.program ?? [];

const gatewaysOf = (
	tables: Record<string, readonly TableRow[]>
): ReturnType<typeof createTableGateways> => createTableGateways(new Map(Object.entries(tables)));

describe('createTableGateways', () => {
	const gateways = gatewaysOf(TABLES);

	it('собирает каталог из Групп мышц, Мишеней и Упражнений', () => {
		expect(gateways.catalog.readCatalog()).toEqual({
			exercises: [
				{
					axial: false,
					catalogTarget: 't-cervical',
					dose: '2×10',
					freeWeight: false,
					id: 'e1',
					lumbarExt: false,
					lumbarFlex: false,
					modality: 'dynamic',
					name: 'Круги головой',
					slug: 'neck_roll'
				},
				{
					axial: true,
					catalogTarget: 't-cardio',
					dose: '5 мин',
					freeWeight: true,
					id: 'e2',
					kgMax: 16,
					lumbarExt: true,
					lumbarFlex: true,
					modality: 'cardio',
					name: 'Велотренажёр',
					slug: 'bike'
				}
			],
			muscleGroups: [{ id: 'g-glutes', ord: 8 }],
			targets: [
				{ id: 't-cervical', muscleGroup: 'g-neck', slug: 'cervical_spine' },
				{ id: 't-cardio', slug: 'cardiorespiratory' }
			]
		});
	});

	it('раскрывает Упражнение: оборудование, Мишени, заметку и шаги с оракулами по порядку', () => {
		const details = gateways.details.readDetails();
		expect(details.get('e1')).toEqual({
			equipment: [{ name: 'Тело', role: 'main' }],
			note: 'медленно',
			steps: [
				{
					active: ['Шейный отдел', 't-ghost'],
					id: 's1',
					oracles: [
						{
							counterModel: ['рывок'],
							id: 'o1',
							model: ['плавно'],
							predicate: 'Плечи опущены'
						}
					],
					title: 'Наклон'
				},
				{
					active: [],
					id: 's2',
					oracles: [
						{ counterModel: [], id: 'o2', model: [], predicate: 'Возврат плавный' }
					],
					title: 'Возврат'
				},
				{ active: [], id: 's3', oracles: [], title: 'Пауза' }
			],
			targets: [{ name: 'Шейный отдел', role: 'primary' }]
		});
		expect(details.get('e2')).toEqual({ equipment: [], steps: [], targets: [] });
	});

	it('собирает Программу с её Блоками, Закреплениями, добором, парами и противопоказаниями', () => {
		expect(gateways.programs.readPrograms()).toEqual([
			{
				blocks: [
					{
						id: 'b-warmup',
						modality: 'dynamic',
						name: 'Разминка',
						ord: 1,
						pairs: [],
						pinnedGroups: [],
						pinnedTargets: [{ id: 't-cervical', ord: 1, pick: 4 }]
					},
					{
						draw: { count: 2, level: 'muscle_group', pickEach: 1 },
						id: 'b-strength',
						modality: 'loaded',
						name: 'Силовой',
						ord: 2,
						pairs: [{ thenTarget: 't-cervical', whenGroup: 'g-glutes' }],
						pinnedGroups: [{ id: 'g-glutes', ord: 1, pick: 1 }],
						pinnedTargets: []
					}
				],
				contraindications: {
					freeWeightKgMax: 10,
					noAxialLoad: true,
					noLumbarExtension: false,
					noLumbarFlexion: true
				},
				id: 'p1',
				title: 'Закрепления и добор'
			}
		]);
	});

	it('не ставит потолок свободного веса, когда Программа его не задаёт', () => {
		const unlimited = gatewaysOf({
			...TABLES,
			program: [{ ...PROGRAM_ROW, free_weight_kg_max: null }]
		});
		expect(unlimited.programs.readPrograms()[0]?.contraindications).toEqual({
			noAxialLoad: true,
			noLumbarExtension: false,
			noLumbarFlexion: true
		});
	});

	it('читает таблицы один раз и держит результат в памяти', () => {
		expect(gateways.catalog.readCatalog()).toBe(gateways.catalog.readCatalog());
		expect(gateways.details.readDetails()).toBe(gateways.details.readDetails());
		expect(gateways.programs.readPrograms()).toBe(gateways.programs.readPrograms());
	});

	it('бросает, когда таблицы нет', () => {
		const withoutTargets = Object.fromEntries(
			Object.entries(TABLES).filter(([name]) => name !== 'target')
		);
		expect(() => gatewaysOf(withoutTargets)).toThrow('target');
	});

	it('бросает, когда в текстовом столбце не строка', () => {
		expect(() => gatewaysOf({ ...TABLES, muscle_group: [{ id: 1, ord: 1 }] })).toThrow('id');
	});

	it('бросает, когда в числовом столбце не число', () => {
		expect(() => gatewaysOf({ ...TABLES, muscle_group: [{ id: 'g', ord: '1' }] })).toThrow(
			'ord'
		);
	});

	it('бросает, когда во флаговом столбце не булево значение', () => {
		expect(() =>
			gatewaysOf({ ...TABLES, program: [{ ...PROGRAM_ROW, no_axial_load: 'да' }] })
		).toThrow('no_axial_load');
	});

	it('бросает на уровне добора вне перечня', () => {
		const draws = [{ block_id: 'b-strength', count: 2, level: 'zone', pick_each: 1 }];
		expect(() => gatewaysOf({ ...TABLES, block_draw: draws })).toThrow('zone');
	});
});
