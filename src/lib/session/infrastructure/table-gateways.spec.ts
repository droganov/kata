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
	block_pin_group: [{ block_id: 'b-strength', muscle_group_id: 'g-glutes', ord: 1, pick: 1 }],
	block_pin_target: [{ block_id: 'b-warmup', ord: 1, pick: 4, target_id: 't-cervical' }],
	exercise: [
		{
			axial: false,
			catalog_target_id: 't-cervical',
			dose: '2×10',
			id: 'e1',
			modality: 'dynamic',
			name: 'Круги головой',
			slug: 'neck_roll'
		}
	],
	muscle_group: [{ id: 'g-glutes', name: 'Ягодичные', ord: 8, slug: 'glutes' }],
	program: [{ id: 'p1', slug: 'pins_and_draw', title: 'Закрепления и добор' }],
	target: [{ id: 't-cervical', kind: 'joint', muscle_group_id: 'g-neck', slug: 'cervical_spine' }]
};

const gatewaysOf = (
	tables: Record<string, readonly TableRow[]>
): ReturnType<typeof createTableGateways> => createTableGateways(new Map(Object.entries(tables)));

describe('createTableGateways', () => {
	const gateways = gatewaysOf(TABLES);

	it('собирает каталог из Групп мышц, Мишеней и Упражнений', () => {
		expect(gateways.catalog.readCatalog()).toEqual({
			exercises: [
				{
					catalogTarget: 't-cervical',
					dose: '2×10',
					id: 'e1',
					modality: 'dynamic',
					name: 'Круги головой',
					slug: 'neck_roll'
				}
			],
			muscleGroups: [{ id: 'g-glutes', ord: 8 }],
			targets: [{ id: 't-cervical', muscleGroup: 'g-neck', slug: 'cervical_spine' }]
		});
	});

	it('собирает Программу с её Блоками, Закреплениями и добором', () => {
		expect(gateways.programs.readPrograms()).toEqual([
			{
				blocks: [
					{
						id: 'b-warmup',
						modality: 'dynamic',
						name: 'Разминка',
						ord: 1,
						pinnedGroups: [],
						pinnedTargets: [{ id: 't-cervical', ord: 1, pick: 4 }]
					},
					{
						draw: { count: 2, level: 'muscle_group', pickEach: 1 },
						id: 'b-strength',
						modality: 'loaded',
						name: 'Силовой',
						ord: 2,
						pinnedGroups: [{ id: 'g-glutes', ord: 1, pick: 1 }],
						pinnedTargets: []
					}
				],
				id: 'p1',
				title: 'Закрепления и добор'
			}
		]);
	});

	it('читает таблицы один раз и держит результат в памяти', () => {
		expect(gateways.catalog.readCatalog()).toBe(gateways.catalog.readCatalog());
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

	it('бросает на уровне добора вне перечня', () => {
		const draws = [{ block_id: 'b-strength', count: 2, level: 'zone', pick_each: 1 }];
		expect(() => gatewaysOf({ ...TABLES, block_draw: draws })).toThrow('zone');
	});
});
