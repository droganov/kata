import { describe, expect, it } from 'vitest';

import type { Catalog } from './catalog.ts';

import { uuidOf } from '../../shared/uuid.ts';
import { bankOf, equipmentOf, targetOf } from './catalog.ts';

const ID = uuidOf('01a0889d-3852-7051-a039-c9778729a468');
const OTHER_ID = uuidOf('01a0889d-3800-7ef5-adfd-a56bcb2334c5');

const catalog: Catalog = {
	banks: [{ id: ID, rules: [], slug: 'warmup', title: 'Разминка', zones: [] }],
	equipment: [
		{
			canon_en: 'Bodyweight',
			exercises: [],
			id: ID,
			kind: 'body',
			name: 'Тело',
			slug: 'body'
		}
	],
	targets: [
		{
			id: ID,
			kind: 'muscle',
			latin: 'Sternocleidomastoid',
			name: 'ГКС',
			slug: 'sternocleidomastoid',
			zone: 'neck'
		}
	]
};

describe('bankOf', () => {
	it('находит банк по slug', () => {
		expect(bankOf(catalog, 'warmup')?.title).toBe('Разминка');
	});

	it('возвращает undefined для отсутствующего банка', () => {
		expect(bankOf(catalog, 'strength')).toBeUndefined();
	});
});

describe('equipmentOf', () => {
	it('находит средство по id', () => {
		expect(equipmentOf(catalog, ID)?.slug).toBe('body');
	});

	it('возвращает undefined для неизвестного id', () => {
		expect(equipmentOf(catalog, OTHER_ID)).toBeUndefined();
	});
});

describe('targetOf', () => {
	it('находит цель по id', () => {
		expect(targetOf(catalog, ID)?.slug).toBe('sternocleidomastoid');
	});

	it('возвращает undefined для неизвестного id', () => {
		expect(targetOf(catalog, OTHER_ID)).toBeUndefined();
	});
});
