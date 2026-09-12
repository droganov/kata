import type {
	SourceCatalog,
	SourceExercise,
	SourceFile,
	SourceLink,
	SourceStep,
	SourceVerdict
} from '../lib/table/domain/source-catalog.ts';
import type { TableSet } from '../lib/table/domain/table-file.ts';

const BODY_EQUIPMENT = '01a0889d-3852-7051-a039-c9778729a468';
const BAND_EQUIPMENT = '01a0889d-3853-7051-a039-c9778729a469';
const CERVICAL_TARGET = '01a0889d-3845-7b73-adc5-6b00a88f5523';
const LATS_TARGET = '01a0889d-3846-7b73-adc5-6b00a88f5524';
const RHOMBOIDS_TARGET = '01a0889d-3847-7b73-adc5-6b00a88f5525';
const CARDIO_TARGET = '01a0889d-3848-7b73-adc5-6b00a88f5526';
const EXERCISE_SLUGS = ['neck_roll', 'neck_press', 'pulldown', 'row'];

const stepsOf = (slug: string, targets: readonly SourceLink[]): readonly SourceStep[] => [
	{
		active: [],
		id: `step-${slug}-1`,
		oracles: [
			{
				counterModel: ['вес перенесён на пятки'],
				id: `oracle-${slug}-1`,
				model: ['стопы на ширине таза'],
				predicate: 'Стойка собрана'
			}
		],
		title: 'Принять исходную стойку'
	},
	{
		active: targets.map((target) => target.id),
		id: `step-${slug}-2`,
		oracles: [
			{
				counterModel: ['жжение в пояснице', 'рывок корпусом'],
				id: `oracle-${slug}-2`,
				model: ['поясница нейтральна', 'движение идёт медленно'],
				predicate: 'Поясница удерживает нейтраль'
			},
			{
				counterModel: ['дыхание задержано'],
				id: `oracle-${slug}-3`,
				model: ['дыхание на выдохе'],
				predicate: 'Дыхание идёт без задержек'
			}
		],
		title: 'Выполнить движение'
	}
];

const exerciseOf = (
	id: string,
	slug: string,
	modality: string,
	targets: readonly SourceLink[],
	extra: Partial<SourceExercise> = {}
): SourceExercise => ({
	constraints: { axial: false, freeWeight: false, lumbarExt: false, lumbarFlex: false },
	dose: '3×12',
	equipment: [{ id: BODY_EQUIPMENT, role: 'main' }],
	id,
	modality,
	name: slug,
	reference: `source-${slug}`,
	slug,
	steps: stepsOf(slug, targets),
	targets,
	...extra
});

const WARMUP: SourceFile = {
	groups: [
		{
			id: 'group-warmup-neck',
			name: 'Шея',
			slug: 'neck',
			targets: [
				{
					exercises: [
						exerciseOf('ex-neck-1', 'neck_roll', 'dynamic', [
							{ id: CERVICAL_TARGET, role: 'primary' }
						])
					],
					id: 'catalog-target-cervical',
					name: 'шейный отдел',
					slug: 'cervical'
				}
			]
		}
	],
	slug: 'warmup'
};

const STRENGTH: SourceFile = {
	groups: [
		{
			id: 'group-neck',
			name: 'Шея',
			slug: 'neck',
			targets: [
				{
					exercises: [
						exerciseOf('ex-neck-2', 'neck_press', 'loaded', [
							{ id: CERVICAL_TARGET, role: 'primary' }
						])
					],
					id: 'catalog-target-neck-flexors',
					name: 'сгибатели шеи',
					slug: 'neck_flexors'
				}
			]
		},
		{
			id: 'group-back',
			name: 'Спина',
			slug: 'back',
			targets: [
				{
					exercises: [
						exerciseOf(
							'ex-lats-1',
							'pulldown',
							'loaded',
							[
								{ id: LATS_TARGET, role: 'primary' },
								{ id: RHOMBOIDS_TARGET, role: 'secondary' }
							],
							{
								constraints: {
									axial: true,
									freeWeight: true,
									kgMax: 10,
									lumbarExt: false,
									lumbarFlex: false
								},
								equipment: [
									{ id: BODY_EQUIPMENT, role: 'main' },
									{ id: BAND_EQUIPMENT, role: 'auxiliary' }
								],
								note: 'хват шире плеч'
							}
						)
					],
					id: 'catalog-target-lats',
					name: 'широчайшие',
					slug: 'lats'
				},
				{
					exercises: [
						exerciseOf('ex-row-1', 'row', 'loaded', [
							{ id: RHOMBOIDS_TARGET, role: 'primary' }
						])
					],
					id: 'catalog-target-rhomboids',
					name: 'ромбовидные',
					slug: 'rhomboids'
				}
			]
		}
	],
	slug: 'strength'
};

const VERDICTS: readonly SourceVerdict[] = [
	{
		hash: 'a'.repeat(40),
		line: 'вес перенесён на пятки',
		oracle: 'oracle-neck_roll-1',
		verdict: 'independent'
	},
	{
		hash: 'b'.repeat(40),
		line: 'жжение в пояснице',
		oracle: 'oracle-neck_roll-2',
		reason: 'наблюдение не противоречит утверждению',
		verdict: 'negation'
	},
	{
		hash: 'c'.repeat(40),
		line: 'строка наблюдения удалена из оракула',
		oracle: 'oracle-neck_roll-2',
		verdict: 'unobservable'
	},
	{
		hash: 'd'.repeat(40),
		line: 'пульс не восстанавливается',
		oracle: 'oracle-cardio-1',
		verdict: 'independent'
	}
];

export const sourceCatalog = (): SourceCatalog => ({
	equipment: [
		{ canonEn: 'Bodyweight', id: BODY_EQUIPMENT, kind: 'body', name: 'Тело', slug: 'body' },
		{ canonEn: 'Band', id: BAND_EQUIPMENT, kind: 'tool', name: 'Резина', slug: 'band' }
	],
	files: [WARMUP, STRENGTH],
	programs: [],
	references: EXERCISE_SLUGS.map((slug) => ({
		id: `source-${slug}`,
		title: `Источник ${slug}`
	})),
	targets: [
		{
			group: 'neck',
			id: CERVICAL_TARGET,
			kind: 'joint',
			latin: 'Columna cervicalis',
			name: 'Шейный отдел позвоночника',
			slug: 'cervical_spine'
		},
		{
			group: 'back',
			id: LATS_TARGET,
			kind: 'muscle',
			latin: 'Latissimus dorsi',
			name: 'Широчайшая',
			slug: 'latissimus_dorsi'
		},
		{
			group: 'back',
			id: RHOMBOIDS_TARGET,
			kind: 'muscle',
			latin: 'Rhomboidei',
			name: 'Ромбовидные',
			slug: 'rhomboids'
		},
		{
			group: 'cardio',
			id: CARDIO_TARGET,
			kind: 'system',
			latin: 'Systema cardiorespiratorium',
			name: 'Система',
			slug: 'cardiorespiratory'
		}
	],
	verdicts: VERDICTS
});

export const tableSetOf = (files: Record<string, readonly unknown[]>): TableSet => ({
	files: Object.entries(files).map(([name, rows]) => ({
		lines: rows.map((parsed, at) => ({ at: at + 1, parsed, text: JSON.stringify(parsed) })),
		name
	}))
});
