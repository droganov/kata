import { describe, expect, it } from 'vitest';

import type { SourceCatalog } from './source-catalog.ts';

import {
	catalogWithProgram,
	programBlocks,
	sourceCatalog,
	sourceProgram
} from '../../../test/table-fixtures.ts';
import { tablesOf } from './convert.ts';

const tables = tablesOf(sourceCatalog());
const rowBySlug = (
	rows: readonly Record<string, unknown>[],
	slug: string
): Record<string, unknown> | undefined => rows.find((row) => row.slug === slug);
const strengthFile = (): SourceCatalog['files'][number] => {
	const file = sourceCatalog().files.find((item) => item.slug === 'strength');
	if (file === undefined) throw new Error('fixture');
	return file;
};
const backGroup = (): SourceCatalog['files'][number]['groups'][number] => {
	const group = strengthFile().groups[1];
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
			slug: 'cervical_spine',
			target_group_id: null
		});
	});

	it('кладут системную мишень без группы мышц', () => {
		expect(rowBySlug(tables.target, 'cardiorespiratory')).toMatchObject({
			kind: 'system',
			muscle_group_id: null
		});
	});

	it('ведут мишень словаря в её анатомическую группу', () => {
		const back = tables.target_group.find((row) => row.slug === 'back');
		expect(rowBySlug(tables.target, 'latissimus_dorsi')?.target_group_id).toBe(back?.id);
	});

	it('бросают, когда несистемная мишень словаря вне групп мышц', () => {
		const targets = sourceCatalog().targets.map((target) =>
			target.slug === 'rhomboids' ? { ...target, group: 'nowhere' } : target
		);
		expect(() => tablesOf({ ...sourceCatalog(), targets })).toThrow('nowhere');
	});

	it('заводят мишень каталога отдельной строкой с именем с большой буквы', () => {
		expect(rowBySlug(tables.target, 'neck_flexors')).toEqual({
			id: 'catalog-target-neck-flexors',
			kind: 'muscle',
			latin: null,
			muscle_group_id: 'group-neck',
			name: 'Сгибатели шеи',
			slug: 'neck_flexors',
			target_group_id: null
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
		const file = strengthFile();
		const broken: SourceCatalog = {
			...sourceCatalog(),
			files: [
				{
					...file,
					groups: [
						file.groups[0]!,
						{ ...group, targets: [{ ...group.targets[0]!, slug: 'unnamed' }] }
					]
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
					excluded: [],
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
					id: 'file-stretch',
					rules: [],
					slug: 'stretch',
					title: 'Растяжка'
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
			core_plane: null,
			dose: '3×12',
			free_weight: true,
			goal_id: null,
			hip_plane: null,
			id: 'ex-lats-1',
			kg_max: 10,
			lumbar_ext: false,
			lumbar_flex: false,
			met: null,
			modality: 'loaded',
			name: 'pulldown',
			note: 'хват шире плеч',
			seconds: null,
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
			exercise_id: 'ex-cardio-1',
			id: 'source-bike',
			note: null,
			title: 'Источник bike',
			url: null
		});
	});

	it('бросает, когда источник упражнения потерян', () => {
		expect(() => tablesOf({ ...sourceCatalog(), references: [] })).toThrow('bike');
	});
});

describe('кардио', () => {
	it('кладёт упражнения кардио под системную мишень с длительностью и MET', () => {
		expect(rowBySlug(tables.exercise, 'bike')).toMatchObject({
			catalog_target_id: '01a0889d-3848-7b73-adc5-6b00a88f5526',
			met: 5,
			modality: 'cardio',
			seconds: 300
		});
	});
});

describe('факты упражнения', () => {
	it('несут плоскость кора, плоскость бедра и цель', () => {
		const catalog = catalogWithProgram();
		const files = catalog.files.map((file) => ({
			...file,
			groups: file.groups.map((group) => ({
				...group,
				targets: group.targets.map((target) => ({
					...target,
					exercises: target.exercises.map((exercise) =>
						exercise.slug === 'row'
							? {
									...exercise,
									corePlane: 'lateral',
									goal: 'glutes',
									hipPlane: 'flexion'
								}
							: exercise
					)
				}))
			}))
		}));
		const converted = tablesOf({ ...catalog, files }, programBlocks());
		const glutes = converted.goal.find((row) => row.slug === 'glutes');
		expect(rowBySlug(converted.exercise, 'row')).toMatchObject({
			core_plane: 'lateral',
			goal_id: glutes?.id,
			hip_plane: 'flexion'
		});
	});
});

describe('цели и владельцы', () => {
	it('бросают, когда у цели нет имени', () => {
		const program = { ...sourceProgram(), goals: { primary: ['mystery'], secondary: [] } };
		expect(() => tablesOf(catalogWithProgram(program))).toThrow('mystery');
	});

	it('по умолчанию берут объявленные Блоки и бросают на чужой программе', () => {
		expect(() => tablesOf(catalogWithProgram())).toThrow('program-1');
	});
});
