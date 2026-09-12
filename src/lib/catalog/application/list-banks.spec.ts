import { describe, expect, it } from 'vitest';

import type { Bank } from '../domain/bank.ts';

import { uuidOf } from '../../shared/uuid.ts';
import { listBanks } from './list-banks.ts';

const ID = uuidOf('01a0889d-3852-7051-a039-c9778729a468');
const bank: Bank = {
	id: ID,
	rules: [],
	slug: 'cardio',
	title: 'Кардио',
	zones: [
		{
			contours: [{ exercises: [], id: ID, slug: 'cardio', title: 'кардио' }],
			id: ID,
			slug: 'cardio',
			title: 'Сердце'
		}
	]
};

describe('listBanks', () => {
	it('отдаёт представления всех банков', () => {
		const views = listBanks({ readAll: () => [bank] });
		expect(views).toHaveLength(1);
		expect(views[0]?.zones[0]?.contours[0]?.exerciseIds).toEqual([]);
	});
});
