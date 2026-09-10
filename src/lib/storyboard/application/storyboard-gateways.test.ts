import { describe, expect, it } from 'vitest';

import type { CatalogGateway } from './catalog-gateway.ts';

import { promptCatalogOf } from './storyboard-gateways.ts';

const CATALOG: CatalogGateway = {
	readEquipment: () => [
		{ canonEn: 'Exercise mat', id: 'eq-mat', kind: 'tool', name: 'Коврик', slug: 'mat' }
	],
	readTargets: () => [
		{
			group: 'core',
			id: 'tg-abs',
			kind: 'muscle',
			latin: 'Rectus abdominis',
			name: 'Прямая мышца живота',
			slug: 'rectus-abdominis',
			zone: 'core'
		}
	]
};

describe('promptCatalogOf', () => {
	it('строит словари средств и целей по идентификаторам', () => {
		const catalog = promptCatalogOf(CATALOG);
		expect(catalog.equipment.get('eq-mat')?.canonEn).toBe('Exercise mat');
		expect(catalog.targets.get('tg-abs')?.latin).toBe('Rectus abdominis');
		expect(catalog.equipment.get('eq-none')).toBeUndefined();
	});
});
