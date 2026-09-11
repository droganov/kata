import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { createCatalogJsonGateway } from './catalog-json-gateway.ts';
import { createSchemaValidator } from './json-schema-validator.ts';
import { TABLE_PATHS } from './table-paths.ts';

const catalog = createCatalogJsonGateway({
	equipmentFile: TABLE_PATHS.equipment,
	modalityDirectory: TABLE_PATHS.modalities,
	referencesFile: TABLE_PATHS.references,
	targetsFile: TABLE_PATHS.targets,
	validator: createSchemaValidator(TABLE_PATHS.schema)
}).readSourceCatalog();

describe('createCatalogJsonGateway на боевых данных', () => {
	it('читает четыре файла в объявленном порядке и не берёт кардио', () => {
		expect(catalog.files.map((file) => file.slug)).toEqual([
			'warmup',
			'strength',
			'calisthenics',
			'stretch'
		]);
	});

	it('переводит зоны в группы мышц, а контуры в мишени каталога', () => {
		const strength = catalog.files.find((file) => file.slug === 'strength');
		expect(strength?.groups.map((group) => group.slug)).toEqual([
			'neck',
			'traps',
			'shoulders',
			'chest',
			'back',
			'arms',
			'core',
			'glutes',
			'thighs',
			'calves'
		]);
		expect(strength?.groups[0]?.targets[0]?.slug).toBe('neck_flexors');
	});

	it('переводит ограничения и режим упражнения', () => {
		const exercise = catalog.files[1]?.groups[0]?.targets[0]?.exercises[0];
		expect(exercise?.modality).toBe('loaded');
		expect(exercise?.constraints.freeWeight).toBe(true);
		expect(exercise?.constraints.kgMax).toBe(10);
		expect(exercise?.reference).toMatch(/^[\da-f-]+$/);
	});

	it('читает словари мишеней, оборудования и источников', () => {
		expect(catalog.targets.some((target) => target.slug === 'latissimus_dorsi')).toBe(true);
		expect(catalog.targets.some((target) => target.group === 'back')).toBe(true);
		expect(catalog.equipment.some((item) => item.canonEn === 'Bodyweight')).toBe(true);
		expect(catalog.references.length).toBeGreaterThan(0);
		expect(catalog.references.some((reference) => reference.note !== undefined)).toBe(true);
	});
});

describe('адрес источника', () => {
	it('переносится, когда он есть в данных', () => {
		const directory = mkdtempSync(path.join(tmpdir(), 'table-references-'));
		const file = path.join(directory, 'sources.json');
		const first = catalog.references[0];
		writeFileSync(
			file,
			JSON.stringify([
				{
					exercise: '01a0889d-3851-7468-b94f-0e0365b0548b',
					id: String(first?.id),
					title: String(first?.title),
					url: 'https://example.com/a'
				}
			]),
			'utf8'
		);
		const withUrl = createCatalogJsonGateway({
			equipmentFile: TABLE_PATHS.equipment,
			modalityDirectory: TABLE_PATHS.modalities,
			referencesFile: file,
			targetsFile: TABLE_PATHS.targets,
			validator: createSchemaValidator(TABLE_PATHS.schema)
		}).readSourceCatalog();
		expect(withUrl.references[0]?.url).toBe('https://example.com/a');
	});
});
