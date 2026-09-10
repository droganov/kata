import { describe, expect, it } from 'vitest';

import type { Bank } from '../domain/bank.ts';
import type { Equipment } from '../domain/equipment.ts';
import type { Target } from '../domain/target.ts';

import { uuidOf } from '../../shared/uuid.ts';
import { bankViewOf, equipmentViewOf, targetViewOf } from './catalog-views.ts';

const ID = uuidOf('01a0889d-3852-7051-a039-c9778729a468');
const EXERCISE_ID = uuidOf('01a0889d-4423-7162-a9b4-f38de9ce3ea4');

const bankOf = (pick: number | undefined): Bank =>
	({
		id: ID,
		rules: [],
		slug: 'warmup',
		title: 'Разминка',
		zones: [
			{
				contours: [
					{
						exercises: [{ id: EXERCISE_ID }],
						id: ID,
						...(pick !== undefined && { pick }),
						slug: 'cervical',
						title: 'Шейный отдел'
					}
				],
				id: ID,
				slug: 'neck',
				title: 'Шея'
			}
		]
	}) as unknown as Bank;

describe('bankViewOf', () => {
	it('переносит структуру зон и контуров с id упражнений', () => {
		const view = bankViewOf(bankOf(4));
		expect(view).toEqual({
			slug: 'warmup',
			title: 'Разминка',
			zones: [
				{
					contours: [
						{
							exerciseIds: [EXERCISE_ID],
							id: ID,
							pick: 4,
							slug: 'cervical',
							title: 'Шейный отдел'
						}
					],
					id: ID,
					slug: 'neck',
					title: 'Шея'
				}
			]
		});
	});

	it('не добавляет pick, когда его нет', () => {
		const [contour] = bankViewOf(bankOf(undefined)).zones[0]!.contours;
		expect(contour).not.toHaveProperty('pick');
	});
});

describe('equipmentViewOf', () => {
	it('переводит средство в DTO с canonEn', () => {
		const equipment = {
			canon_en: 'Bodyweight',
			exercises: [],
			id: ID,
			kind: 'body',
			name: 'Тело',
			slug: 'body'
		} as Equipment;
		expect(equipmentViewOf(equipment)).toEqual({
			canonEn: 'Bodyweight',
			id: ID,
			kind: 'body',
			name: 'Тело',
			slug: 'body'
		});
	});
});

describe('targetViewOf', () => {
	it('переносит группу, когда она задана', () => {
		const target = {
			group: 'neck',
			id: ID,
			kind: 'muscle',
			latin: 'Sternocleidomastoid',
			name: 'ГКС',
			slug: 'sternocleidomastoid',
			zone: 'neck'
		} as Target;
		expect(targetViewOf(target).group).toBe('neck');
	});

	it('не добавляет группу, когда её нет', () => {
		const target = {
			id: ID,
			kind: 'joint',
			latin: 'Cervical spine',
			name: 'Шейный отдел',
			slug: 'cervical_spine',
			zone: 'neck'
		} as Target;
		expect(targetViewOf(target)).not.toHaveProperty('group');
	});
});
