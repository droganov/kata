import { mkdtempSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import type { SchemaValidator } from './json-schema-validator.ts';

import { createCatalogJsonGateway } from './catalog-json-gateway.ts';

const EQUIPMENT = [
	{
		canon_en: 'Exercise mat',
		exercises: [],
		id: 'eq-mat',
		kind: 'tool',
		name: 'Коврик',
		slug: 'mat'
	}
];

const TARGETS = [
	{
		group: 'core',
		id: 'tg-abs',
		kind: 'muscle',
		latin: 'Rectus abdominis',
		name: 'Прямая мышца живота',
		slug: 'rectus-abdominis',
		zone: 'core'
	}
];

const directory = mkdtempSync(path.join(os.tmpdir(), 'storyboard-catalog-'));
const equipmentFile = path.join(directory, 'equipment.json');
const targetsFile = path.join(directory, 'targets.json');
writeFileSync(equipmentFile, JSON.stringify(EQUIPMENT), 'utf8');
writeFileSync(targetsFile, JSON.stringify(TARGETS), 'utf8');

const subjects: string[] = [];
const validator: SchemaValidator = {
	assertValid: (schemaId, value, subject) => {
		subjects.push(`${schemaId} ${subject}`);
	}
};

const gateway = createCatalogJsonGateway({ equipmentFile, targetsFile, validator });

describe('createCatalogJsonGateway', () => {
	it('отдаёт средства каталога и проверяет их по схеме', () => {
		expect(gateway.readEquipment()).toEqual([
			{ canonEn: 'Exercise mat', id: 'eq-mat', kind: 'tool', name: 'Коврик', slug: 'mat' }
		]);
		expect(subjects).toContain(`equipment.schema.json ${equipmentFile}#0`);
	});

	it('отдаёт цели каталога и проверяет их по схеме', () => {
		expect(gateway.readTargets()).toEqual([
			{
				group: 'core',
				id: 'tg-abs',
				kind: 'muscle',
				latin: 'Rectus abdominis',
				name: 'Прямая мышца живота',
				slug: 'rectus-abdominis',
				zone: 'core'
			}
		]);
		expect(subjects).toContain(`target.schema.json ${targetsFile}#0`);
	});
});
