import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';

import type { SchemaValidator } from './json-schema-validator.ts';

import { createCatalogJsonGateway } from './catalog-json-gateway.ts';

const directory = mkdtempSync(path.join(tmpdir(), 'exercise-catalog-'));
const equipmentFile = path.join(directory, 'equipment.json');
const targetsFile = path.join(directory, 'targets.json');
writeFileSync(
	equipmentFile,
	JSON.stringify([
		{
			canon_en: 'Bodyweight',
			exercises: [],
			id: 'body',
			kind: 'body',
			name: 'Тело',
			slug: 'body'
		}
	]),
	'utf8'
);
writeFileSync(
	targetsFile,
	JSON.stringify([
		{
			id: 't1',
			kind: 'muscle',
			latin: 'Iliopsoas',
			name: 'Подвздошная',
			slug: 'iliopsoas',
			zone: 'hip'
		}
	]),
	'utf8'
);

describe('createCatalogJsonGateway', () => {
	it('отдаёт средства и цели каталога через его use cases', () => {
		const assertValid = vi.fn<SchemaValidator['assertValid']>();
		const gateway = createCatalogJsonGateway({
			equipmentFile,
			targetsFile,
			validator: { assertValid }
		});
		expect(gateway.readEquipment()).toEqual([
			{ canonEn: 'Bodyweight', id: 'body', kind: 'body', name: 'Тело', slug: 'body' }
		]);
		expect(gateway.readTargets().map((target) => target.kind)).toEqual(['muscle']);
		expect(assertValid.mock.calls.map((call) => call[0])).toEqual([
			'equipment.schema.json',
			'target.schema.json'
		]);
	});

	it('поднимает ошибку схемы наружу', () => {
		const assertValid = vi.fn(() => {
			throw new Error('схема нарушена');
		});
		const gateway = createCatalogJsonGateway({
			equipmentFile,
			targetsFile,
			validator: { assertValid }
		});
		expect(() => gateway.readEquipment()).toThrow('схема нарушена');
	});
});
