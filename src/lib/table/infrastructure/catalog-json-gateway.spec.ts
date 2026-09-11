import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { createCatalogJsonGateway } from './catalog-json-gateway.ts';
import { createSchemaValidator } from './json-schema-validator.ts';
import { TABLE_PATHS } from './table-paths.ts';

const REASON = 'наблюдение не противоречит утверждению';
const REASONED_VERDICT = '01a0889d-3855-7add-9814-7cd71dc7b3f5';

const catalog = createCatalogJsonGateway({
	equipmentFile: TABLE_PATHS.equipment,
	modalityDirectory: TABLE_PATHS.modalities,
	referencesFile: TABLE_PATHS.references,
	targetsFile: TABLE_PATHS.targets,
	validator: createSchemaValidator(TABLE_PATHS.schema),
	verdictsFile: TABLE_PATHS.verdicts
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
			validator: createSchemaValidator(TABLE_PATHS.schema),
			verdictsFile: TABLE_PATHS.verdicts
		}).readSourceCatalog();
		expect(withUrl.references[0]?.url).toBe('https://example.com/a');
	});
});

describe('процедуры и вердикты', () => {
	it('читает шаги упражнения с целями фазы и оракулами', () => {
		const exercise = catalog.files[0]?.groups[0]?.targets[0]?.exercises[0];
		const step = exercise?.steps[1];
		expect(exercise?.steps.length).toBeGreaterThan(1);
		expect(step?.title).toBe('Опустить подбородок к груди');
		expect(step?.active).toEqual(['01a0889d-3845-7b73-adc5-6b00a88f5523']);
		expect(step?.oracles[0]?.predicate).toBe('Плечи остаются опущенными при опускании');
		expect(step?.oracles[0]?.model).toContain('плечи остаются опущенными');
		expect(step?.oracles[0]?.counterModel).toContain('хруст в шее с болью');
	});

	it('читает вердикты судьи со ссылкой на оракул и строку наблюдения', () => {
		const verdict = catalog.verdicts.find(
			(item) => item.oracle === '01a0889d-3854-78be-a741-f14e631d24f1'
		);
		expect(verdict?.line).toBe('вес перенесён на пятки');
		expect(verdict?.verdict).toBe('independent');
		expect(catalog.verdicts.length).toBeGreaterThan(0);
	});
});

describe('причина вердикта', () => {
	it('переносится, когда судья её оставил', () => {
		const directory = mkdtempSync(path.join(tmpdir(), 'table-verdicts-'));
		const file = path.join(directory, 'verdicts.json');
		const first = catalog.verdicts[0];
		writeFileSync(
			file,
			JSON.stringify([{ ...first, id: REASONED_VERDICT, reason: REASON }]),
			'utf8'
		);
		const withReason = createCatalogJsonGateway({
			equipmentFile: TABLE_PATHS.equipment,
			modalityDirectory: TABLE_PATHS.modalities,
			referencesFile: TABLE_PATHS.references,
			targetsFile: TABLE_PATHS.targets,
			validator: createSchemaValidator(TABLE_PATHS.schema),
			verdictsFile: file
		}).readSourceCatalog();
		expect(withReason.verdicts[0]?.reason).toBe(REASON);
	});
});
