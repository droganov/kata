import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';

import type { JsonObject } from '../../../test/json.ts';

import { jsonObjectOf } from '../../../test/json.ts';
import { createCatalogJsonGateway } from './catalog-json-gateway.ts';
import { createSchemaValidator } from './json-schema-validator.ts';
import { TABLE_PATHS } from './table-paths.ts';

vi.setConfig({ testTimeout: 60_000 });

const REASON = 'наблюдение не противоречит утверждению';
const REASONED_VERDICT = '01a0889d-3855-7add-9814-7cd71dc7b3f5';

const PATHS = {
	equipmentFile: TABLE_PATHS.equipment,
	modalityDirectory: TABLE_PATHS.modalities,
	programsFile: TABLE_PATHS.programs,
	referencesFile: TABLE_PATHS.references,
	targetsFile: TABLE_PATHS.targets,
	usersFile: TABLE_PATHS.users,
	verdictsFile: TABLE_PATHS.verdicts
};

const gatewayOf = (paths: Partial<typeof PATHS>): ReturnType<typeof createCatalogJsonGateway> =>
	createCatalogJsonGateway({
		...PATHS,
		...paths,
		validator: createSchemaValidator(TABLE_PATHS.schema)
	});

const catalog = gatewayOf({}).readSourceCatalog();
const fileOf = (slug: string): (typeof catalog.files)[number] | undefined =>
	catalog.files.find((file) => file.slug === slug);
const exercisesOf = (
	slug: string
): readonly (typeof catalog.files)[number]['groups'][number]['targets'][number]['exercises'][number][] =>
	(fileOf(slug)?.groups ?? []).flatMap((group) =>
		group.targets.flatMap((target) => target.exercises)
	);
const scratch = (name: string): string => mkdtempSync(path.join(tmpdir(), name));
const withoutKeys = (object: JsonObject, keys: readonly string[]): JsonObject =>
	Object.fromEntries(Object.entries(object).filter(([key]) => !keys.includes(key)));
const OPTIONAL_PROGRAM_KEYS = ['hip_planes', 'outside_gym', 'pairing', 'volume_targets'];

describe('createCatalogJsonGateway на боевых данных', () => {
	it('читает пять файлов в объявленном порядке, кардио первым', () => {
		expect(catalog.files.map((file) => file.slug)).toEqual([
			'cardio',
			'warmup',
			'strength',
			'calisthenics',
			'stretch'
		]);
	});

	it('переводит зоны в группы мышц, а контуры в мишени каталога', () => {
		expect(fileOf('strength')?.groups.map((group) => group.slug)).toEqual([
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
		expect(fileOf('strength')?.groups[0]?.targets[0]?.slug).toBe('neck_flexors');
	});

	it('переводит ограничения и режим упражнения', () => {
		const exercise = exercisesOf('strength')[0];
		expect(exercise?.modality).toBe('loaded');
		expect(exercise?.constraints.freeWeight).toBe(true);
		expect(exercise?.constraints.kgMax).toBe(10);
		expect(exercise?.reference).toMatch(/^[\da-f-]+$/);
	});

	it('несёт факты файла: title, session_budget_sec, excluded[] и zones[].rule', () => {
		expect(fileOf('warmup')?.title).toBe('Разминка');
		expect(fileOf('warmup')?.sessionBudgetSec).toBe(420);
		expect(fileOf('strength')?.excluded).toHaveLength(10);
		expect(fileOf('strength')?.excluded[0]?.reason).toBe('осевая нагрузка на позвоночник');
		expect(fileOf('strength')?.rules).toEqual([]);
		expect(fileOf('stretch')?.groups.find((group) => group.slug === 'back')?.rule).toContain(
			'поясница'
		);
	});

	it('несёт длительность, MET, плоскости и цель упражнения', () => {
		expect(exercisesOf('cardio').every((exercise) => exercise.met !== undefined)).toBe(true);
		expect(exercisesOf('warmup').every((exercise) => exercise.seconds !== undefined)).toBe(
			true
		);
		expect(exercisesOf('calisthenics').filter((exercise) => exercise.corePlane)).toHaveLength(
			10
		);
		expect(exercisesOf('stretch').filter((exercise) => exercise.hipPlane)).toHaveLength(12);
		expect(
			exercisesOf('strength').filter((exercise) => exercise.goal === 'glutes')
		).toHaveLength(2);
	});

	it('читает словари мишеней с анатомической группой, оборудования и источников', () => {
		const posterior = catalog.targets.find((target) => target.slug === 'deltoid_posterior');
		expect(posterior?.targetGroup).toBe('rear_delt');
		expect(
			catalog.targets.find((target) => target.slug === 'knee')?.targetGroup
		).toBeUndefined();
		expect(catalog.targets.some((target) => target.group === 'back')).toBe(true);
		expect(catalog.equipment.some((item) => item.canonEn === 'Bodyweight')).toBe(true);
		expect(catalog.references.some((reference) => reference.note !== undefined)).toBe(true);
	});

	it('читает владельцев программ', () => {
		expect(catalog.persons).toEqual([
			{
				id: '01a0889d-8ae9-7ccd-b01b-9dc927862f2c',
				name: 'Sergei',
				programs: ['01a0889d-8ae8-7c8a-b964-0ead5f668a5a']
			}
		]);
	});

	it('держит сырые документы всех источников для реестра путей', () => {
		expect(catalog.documents.map((document) => document.kind)).toEqual([
			'banks',
			'banks',
			'banks',
			'banks',
			'banks',
			'equipment',
			'programs',
			'sources',
			'targets',
			'users',
			'verdicts'
		]);
	});
});

describe('программы', () => {
	const [program] = catalog.programs;

	it('читает владельца, название, расписание и противопоказания', () => {
		expect(program?.id).toBe('01a0889d-8ae8-7c8a-b964-0ead5f668a5a');
		expect(program?.person).toBe('01a0889d-8ae9-7ccd-b01b-9dc927862f2c');
		expect(program?.title).toBe('Программа: БАЗА + ПУЛ');
		expect(program?.sessionsPerWeek).toBe(3);
		expect(program?.sessionBudgetMin).toBe(70);
		expect(program?.contraindications).toEqual({
			axialLoad: true,
			freeWeightKgMax: 10,
			lumbarExtension: true,
			lumbarFlexion: true
		});
	});

	it('читает цели, тайминг, объём, прогрессию и плоскости бедра', () => {
		expect(program?.goals.secondary).toEqual(['strength', 'endurance', 'flexibility']);
		expect(program?.timing).toEqual({
			holdRestSec: 10,
			restSecAccessory: 60,
			restSecStrength: 70,
			transitionSec: 45,
			warmupGeneralMin: 5,
			workSecPerSet: 45
		});
		expect(program?.volumes).toContainEqual({ group: 'glutes', max: 22, min: 12 });
		expect(program?.progression.stopRule).toContain('к врачу');
		expect(program?.hipPlanes).toHaveLength(6);
	});

	it('читает занятия вне зала, пары и sections[] со slots[]', () => {
		expect(program?.outsideGym).toEqual([
			{
				intensity: 'moderate',
				key: 'walking',
				minutes: 45,
				name: 'Ходьба в разговорном темпе',
				perWeek: 4
			},
			{ key: 'mobility_home', minutes: 10, name: 'Подвижность дома', perWeek: 7 }
		]);
		expect(program?.pairings).toHaveLength(4);
		expect(program?.sections.map((section) => section.slug)).toEqual([
			'warmup_cardio',
			'warmup',
			'strength',
			'calisthenics',
			'stretch'
		]);
		const warmup = program?.sections[1]?.slots[0];
		expect(warmup).toMatchObject({
			kind: 'pool',
			label: 'Шея · шейный отдел',
			pick: 4,
			secEach: 20
		});
		expect(program?.rotationWeeks).toBe(2);
		expect(program?.sections[2]?.slots[1]?.allowRepeat).toBe(false);
		expect(fileOf('warmup')?.groups[0]?.targets[0]?.pick).toBe(4);
		expect(exercisesOf('warmup')[0]?.procedureId).toMatch(/^[\da-f-]+$/);
		expect(program?.sections[2]?.slots[0]?.pick).toBeUndefined();
		expect(program?.sections[3]?.slots[1]?.rule).toContain('lateral');
	});

	it('даёт пустые перечни, когда необязательных полей нет', () => {
		const programs = catalog.documents.find((document) => document.kind === 'programs')?.value;
		const real = jsonObjectOf(JSON.stringify(Array.isArray(programs) ? programs[0] : null));
		const timing = withoutKeys(jsonObjectOf(JSON.stringify(real.timing)), [
			'warmup_general_min'
		]);
		const file = path.join(scratch('table-programs-'), 'programs.json');
		writeFileSync(
			file,
			JSON.stringify([{ ...withoutKeys(real, OPTIONAL_PROGRAM_KEYS), timing }]),
			'utf8'
		);
		const [minimal] = gatewayOf({ programsFile: file }).readSourceCatalog().programs;
		expect(minimal?.hipPlanes).toEqual([]);
		expect(minimal?.outsideGym).toEqual([]);
		expect(minimal?.pairings).toEqual([]);
		expect(minimal?.volumes).toEqual([]);
		expect(minimal?.timing.warmupGeneralMin).toBeUndefined();
	});
});

describe('файл каталога без исключений', () => {
	it('даёт пустой перечень исключений', () => {
		const directory = scratch('table-banks-');
		const cardio = jsonObjectOf(
			readFileSync(path.join(TABLE_PATHS.modalities, 'cardio.json'), 'utf8')
		);
		writeFileSync(
			path.join(directory, 'cardio.json'),
			JSON.stringify(withoutKeys(cardio, ['excluded'])),
			'utf8'
		);
		const [file] = gatewayOf({ modalityDirectory: directory }).readSourceCatalog().files;
		expect(file?.excluded).toEqual([]);
	});
});

describe('адрес источника', () => {
	it('переносится, когда он есть в данных', () => {
		const file = path.join(scratch('table-references-'), 'sources.json');
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
		expect(gatewayOf({ referencesFile: file }).readSourceCatalog().references[0]?.url).toBe(
			'https://example.com/a'
		);
	});
});

describe('процедуры и вердикты', () => {
	it('читает шаги упражнения с целями фазы и оракулами', () => {
		const exercise = exercisesOf('warmup')[0];
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
	});
});

describe('причина вердикта', () => {
	it('переносится, когда судья её оставил', () => {
		const file = path.join(scratch('table-verdicts-'), 'verdicts.json');
		const first = catalog.verdicts[0];
		writeFileSync(
			file,
			JSON.stringify([{ ...first, id: REASONED_VERDICT, reason: REASON }]),
			'utf8'
		);
		expect(gatewayOf({ verdictsFile: file }).readSourceCatalog().verdicts[0]?.reason).toBe(
			REASON
		);
	});
});
