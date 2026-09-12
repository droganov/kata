import { describe, expect, it } from 'vitest';

import type { Bank } from '../domain/bank.ts';
import type { Equipment } from '../domain/equipment.ts';
import type { Target } from '../domain/target.ts';

import { uuidOf } from '../../shared/uuid.ts';
import { catalogOf } from './catalog-repositories.ts';

const ID = uuidOf('01a0889d-3852-7051-a039-c9778729a468');
const bank: Bank = { id: ID, rules: [], slug: 'cardio', title: 'Кардио', zones: [] };
const equipment: Equipment = {
	canon_en: 'Bodyweight',
	exercises: [],
	id: ID,
	kind: 'body',
	name: 'Тело',
	slug: 'body'
};
const target: Target = {
	id: ID,
	kind: 'system',
	latin: 'Cardiovascular system',
	name: 'Сердце',
	slug: 'cardiovascular',
	zone: 'cardio'
};

describe('catalogOf', () => {
	it('собирает снимок каталога из репозиториев', () => {
		const catalog = catalogOf({
			banks: { readAll: () => [bank] },
			equipment: { readAll: () => [equipment] },
			targets: { readAll: () => [target] }
		});
		expect(catalog).toEqual({ banks: [bank], equipment: [equipment], targets: [target] });
	});
});
