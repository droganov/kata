import { describe, expect, it } from 'vitest';

import type { Equipment } from '../domain/equipment.ts';

import { uuidOf } from '../../shared/uuid.ts';
import { findEquipment } from './find-equipment.ts';

const BODY_ID = uuidOf('01a0889d-3852-7051-a039-c9778729a468');
const PLATE_ID = uuidOf('01a0889d-3800-7ef5-adfd-a56bcb2334c5');

const items: readonly Equipment[] = [
	{
		canon_en: 'Bodyweight',
		exercises: [],
		id: BODY_ID,
		kind: 'body',
		name: 'Тело',
		slug: 'body'
	},
	{
		canon_en: 'Plate',
		exercises: [],
		id: PLATE_ID,
		kind: 'free_weight',
		name: 'Блин',
		slug: 'plate'
	}
];
const repository = { readAll: () => items };

describe('findEquipment', () => {
	it('без фильтра отдаёт все средства', () => {
		expect(findEquipment(repository).map((view) => view.slug)).toEqual(['body', 'plate']);
	});

	it('с фильтром отдаёт только запрошенные', () => {
		expect(findEquipment(repository, [PLATE_ID]).map((view) => view.canonEn)).toEqual([
			'Plate'
		]);
	});
});
