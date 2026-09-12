import { describe, expect, it } from 'vitest';

import type { SourceCatalog } from './source-catalog.ts';

import { sourceCatalog } from '../../../test/table-fixtures.ts';
import { tablesOf } from './convert.ts';

const tables = tablesOf(sourceCatalog());
const rowBySlug = (
	rows: readonly Record<string, unknown>[],
	slug: string
): Record<string, unknown> | undefined => rows.find((row) => row.slug === slug);
const backGroup = (): SourceCatalog['files'][number]['groups'][number] => {
	const group = sourceCatalog().files[1]?.groups[1];
	if (group === undefined) throw new Error('fixture');
	return group;
};

describe('группы мышц', () => {
	it('берутся группами силового файла и нумеруются с единицы', () => {
		expect(tables.muscle_group).toEqual([
			{ id: 'group-neck', name: 'Шея', ord: 1, slug: 'neck' },
			{ id: 'group-back', name: 'Спина', ord: 2, slug: 'back' }
		]);
	});

	it('бросает, когда силового файла в источнике нет', () => {
		expect(() => tablesOf({ ...sourceCatalog(), files: [] })).toThrow('strength');
	});
});

describe('мишени', () => {
	it('несут группу мышц, вид и латынь словаря', () => {
		expect(rowBySlug(tables.target, 'cervical_spine')).toEqual({
			id: '01a0889d-3845-7b73-adc5-6b00a88f5523',
			kind: 'joint',
			latin: 'Columna cervicalis',
			muscle_group_id: 'group-neck',
			name: 'Шейный отдел позвоночника',
			slug: 'cervical_spine'
		});
	});

	it('пропускают словарь вне десяти групп мышц', () => {
		expect(rowBySlug(tables.target, 'cardiorespiratory')).toBeUndefined();
	});

	it('заводят мишень каталога отдельной строкой с именем с большой буквы', () => {
		expect(rowBySlug(tables.target, 'neck_flexors')).toEqual({
			id: 'catalog-target-neck-flexors',
			kind: 'muscle',
			latin: null,
			muscle_group_id: 'group-neck',
			name: 'Сгибатели шеи',
			slug: 'neck_flexors'
		});
	});

	it('склеивает мишень каталога со записью словаря, оставляя одну строку', () => {
		expect(rowBySlug(tables.target, 'lats')).toBeUndefined();
		expect(tables.target.filter((row) => row.slug === 'latissimus_dorsi')).toHaveLength(1);
		expect(rowBySlug(tables.target, 'latissimus_dorsi')?.latin).toBe('Latissimus dorsi');
		expect(tables.target.filter((row) => row.slug === 'rhomboids')).toHaveLength(1);
	});

	it('бросает, когда вид мишени каталога не объявлен', () => {
		const group = backGroup();
		const broken: SourceCatalog = {
			...sourceCatalog(),
			files: [
				{
					groups: [{ ...group, targets: [{ ...group.targets[0]!, slug: 'unnamed' }] }],
					slug: 'strength'
				}
			]
		};
		expect(() => tablesOf(broken)).toThrow('unnamed');
	});

	it('бросает, когда приписанной записи словаря нет', () => {
		const broken: SourceCatalog = {
			...sourceCatalog(),
			targets: sourceCatalog().targets.filter((target) => target.slug !== 'cervical_spine')
		};
		expect(() => tablesOf(broken)).toThrow('cervical_spine');
	});

	it('бросает, когда группа чужого файла не стала группой мышц', () => {
		const group = backGroup();
		const catalog = sourceCatalog();
		const broken: SourceCatalog = {
			...catalog,
			files: [
				...catalog.files,
				{
					groups: [
						{
							id: 'group-lumbar',
							name: 'Поясница',
							slug: 'lumbar',
							targets: [
								{
									...group.targets[0]!,
									id: 'catalog-target-quads',
									slug: 'quads_c'
								}
							]
						}
					],
					slug: 'stretch'
				}
			]
		};
		expect(() => tablesOf(broken)).toThrow('lumbar');
	});
});

describe('упражнения', () => {
	it('несут режим, мишень каталога и противопоказания', () => {
		expect(rowBySlug(tables.exercise, 'pulldown')).toEqual({
			axial: true,
			catalog_target_id: '01a0889d-3846-7b73-adc5-6b00a88f5524',
			dose: '3×12',
			free_weight: true,
			id: 'ex-lats-1',
			kg_max: 10,
			lumbar_ext: false,
			lumbar_flex: false,
			modality: 'loaded',
			name: 'pulldown',
			note: 'хват шире плеч',
			slug: 'pulldown'
		});
	});

	it('кладут null вместо отсутствующей заметки и потолка веса', () => {
		const row = rowBySlug(tables.exercise, 'neck_roll');
		expect(row?.note).toBeNull();
		expect(row?.kg_max).toBeNull();
		expect(row?.catalog_target_id).toBe('01a0889d-3845-7b73-adc5-6b00a88f5523');
	});
});

describe('связи', () => {
	it('записывают мишени упражнения с ролями', () => {
		expect(tables.exercise_target.filter((row) => row.exercise_id === 'ex-lats-1')).toEqual([
			{
				exercise_id: 'ex-lats-1',
				role: 'primary',
				target_id: '01a0889d-3846-7b73-adc5-6b00a88f5524'
			},
			{
				exercise_id: 'ex-lats-1',
				role: 'secondary',
				target_id: '01a0889d-3847-7b73-adc5-6b00a88f5525'
			}
		]);
	});

	it('записывают оборудование упражнения один раз', () => {
		expect(tables.exercise_equipment.filter((row) => row.exercise_id === 'ex-lats-1')).toEqual([
			{
				equipment_id: '01a0889d-3852-7051-a039-c9778729a468',
				exercise_id: 'ex-lats-1',
				role: 'main'
			},
			{
				equipment_id: '01a0889d-3853-7051-a039-c9778729a469',
				exercise_id: 'ex-lats-1',
				role: 'auxiliary'
			}
		]);
	});

	it('переносят оборудование без обратной связи', () => {
		expect(rowBySlug(tables.equipment, 'body')).toEqual({
			canon_en: 'Bodyweight',
			id: '01a0889d-3852-7051-a039-c9778729a468',
			kind: 'body',
			name: 'Тело',
			slug: 'body'
		});
	});
});

describe('источники', () => {
	it('кладут по строке на упражнение с null вместо адреса', () => {
		expect(tables.exercise_source).toHaveLength(tables.exercise.length);
		expect(tables.exercise_source[0]).toEqual({
			exercise_id: 'ex-neck-1',
			id: 'source-neck_roll',
			note: null,
			title: 'Источник neck_roll',
			url: null
		});
	});

	it('бросает, когда источник упражнения потерян', () => {
		expect(() => tablesOf({ ...sourceCatalog(), references: [] })).toThrow('neck_roll');
	});
});

describe('программы', () => {
	const program = {
		contraindications: {
			axialLoad: true,
			freeWeightKgMax: 10,
			lumbarExtension: true,
			lumbarFlexion: true
		},
		id: 'program-1',
		person: 'person-1',
		sessionBudgetMin: 70,
		sessionsPerWeek: 3
	};
	const declared = {
		'program-1': {
			blocks: [
				{
					modality: 'loaded',
					name: 'Силовой',
					pinnedGroups: [{ pick: 1, slug: 'back' }],
					pinnedTargets: [
						{ pick: 1, slug: 'cervical_spine' },
						{ pick: 1, slug: 'neck_flexors' }
					]
				}
			],
			slug: 'pins_and_draw',
			title: 'Закрепления и добор'
		}
	};

	it('закрепляют мишени словаря и каталога и группы мышц по их строкам', () => {
		const withProgram = tablesOf({ ...sourceCatalog(), programs: [program] }, declared);
		expect(withProgram.program.map((row) => row.id)).toEqual(['program-1']);
		expect(withProgram.block_pin_target.map((row) => row.target_id)).toEqual([
			'01a0889d-3845-7b73-adc5-6b00a88f5523',
			'catalog-target-neck-flexors'
		]);
		expect(withProgram.block_pin_group.map((row) => row.muscle_group_id)).toEqual([
			'group-back'
		]);
	});

	it('по умолчанию берут объявленные Блоки и бросают на чужой программе', () => {
		expect(() => tablesOf({ ...sourceCatalog(), programs: [program] })).toThrow('program-1');
	});
});
