import type { SourceProgramBlocks } from '../lib/table/domain/program-blocks.ts';
import type {
	SourceCatalog,
	SourceExercise,
	SourceFile,
	SourceLink,
	SourceProgram,
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
const EXERCISE_SLUGS = ['bike', 'neck_roll', 'neck_press', 'pulldown', 'row'];
export const PROGRAM_ID = 'program-1';

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
	procedureId: `procedure-${slug}`,
	reference: `source-${slug}`,
	slug,
	steps: stepsOf(slug, targets),
	targets,
	...extra
});

const CARDIO: SourceFile = {
	excluded: [],
	groups: [
		{
			id: 'group-cardio',
			name: 'Сердце, сосуды, лёгкие',
			slug: 'cardio',
			targets: [
				{
					exercises: [
						exerciseOf(
							'ex-cardio-1',
							'bike',
							'cardio',
							[{ id: CARDIO_TARGET, role: 'primary' }],
							{ met: 5, seconds: 300 }
						)
					],
					id: 'catalog-target-cardio',
					name: 'кардио',
					slug: 'cardio'
				}
			]
		}
	],
	id: 'file-cardio',
	rules: [],
	slug: 'cardio',
	title: 'Разогрев'
};

const WARMUP: SourceFile = {
	excluded: [],
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
					pick: 4,
					slug: 'cervical'
				}
			]
		}
	],
	id: 'file-warmup',
	rules: [],
	sessionBudgetSec: 420,
	slug: 'warmup',
	title: 'Разминка'
};

const STRENGTH: SourceFile = {
	excluded: [{ name: 'Становая тяга', reason: 'наклон под нагрузкой' }],
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
			rule: 'амплитуда до нейтрали',
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
	id: 'file-strength',
	rules: [],
	slug: 'strength',
	title: 'Силовой'
};

const VERDICTS: readonly SourceVerdict[] = [
	{
		hash: 'a'.repeat(40),
		id: 'verdict-a',
		line: 'вес перенесён на пятки',
		oracle: 'oracle-neck_roll-1',
		verdict: 'independent'
	},
	{
		hash: 'b'.repeat(40),
		id: 'verdict-b',
		line: 'жжение в пояснице',
		oracle: 'oracle-neck_roll-2',
		reason: 'наблюдение не противоречит утверждению',
		verdict: 'negation'
	},
	{
		hash: 'c'.repeat(40),
		id: 'verdict-c',
		line: 'строка наблюдения удалена из оракула',
		oracle: 'oracle-neck_roll-2',
		verdict: 'unobservable'
	},
	{
		hash: 'd'.repeat(40),
		id: 'verdict-d',
		line: 'пульс не восстанавливается',
		oracle: 'oracle-cardio-1',
		verdict: 'independent'
	}
];

export const sourceCatalog = (): SourceCatalog => ({
	documents: [],
	equipment: [
		{ canonEn: 'Bodyweight', id: BODY_EQUIPMENT, kind: 'body', name: 'Тело', slug: 'body' },
		{ canonEn: 'Band', id: BAND_EQUIPMENT, kind: 'tool', name: 'Резина', slug: 'band' }
	],
	files: [CARDIO, WARMUP, STRENGTH],
	persons: [],
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
			slug: 'latissimus_dorsi',
			targetGroup: 'back'
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

export const programBlocks = (): Readonly<Record<string, SourceProgramBlocks>> => ({
	[PROGRAM_ID]: {
		blocks: {
			strength: {
				draw: { count: 1, level: 'muscle_group', pickEach: 1 },
				name: 'Силовой блок',
				pinnedGroups: [{ pick: 1, slug: 'back' }]
			}
		},
		slug: 'pins_and_draw'
	}
});

export const sourceProgram = (): SourceProgram => ({
	contraindications: {
		axialLoad: true,
		freeWeightKgMax: 10,
		lumbarExtension: true,
		lumbarFlexion: false
	},
	goals: { primary: ['glutes'], secondary: ['strength'] },
	hipPlanes: ['flexion'],
	id: PROGRAM_ID,
	outsideGym: [
		{
			intensity: 'moderate',
			key: 'walking',
			minutes: 45,
			name: 'Ходьба',
			perWeek: 4
		},
		{ key: 'mobility_home', minutes: 10, name: 'Подвижность дома', perWeek: 7 }
	],
	pairings: [{ exercises: ['ex-neck-1'], slot: 'slot-pool' }],
	person: 'person-1',
	progression: {
		drawn: 'добор',
		isometric: 'изометрия',
		pinned: 'закрепления',
		stopRule: 'стоп'
	},
	rotationWeeks: 2,
	sections: [
		{
			bank: 'file-cardio',
			id: 'section-cardio',
			mode: 'cardio',
			slots: [
				{
					allowRepeat: true,
					exercises: ['ex-cardio-1'],
					id: 'slot-cardio',
					kind: 'pool',
					label: 'Кардио',
					pick: 1,
					secEach: 260
				}
			],
			slug: 'warmup_cardio',
			title: 'Разогрев'
		},
		{
			bank: 'file-warmup',
			id: 'section-warmup',
			mode: 'dynamic',
			slots: [
				{
					exercises: ['ex-neck-1'],
					id: 'slot-neck',
					kind: 'pool',
					label: 'Шея',
					pick: 1,
					secEach: 20
				}
			],
			slug: 'warmup',
			title: 'Разминка'
		},
		{
			bank: 'file-strength',
			id: 'section-strength',
			mode: 'loaded',
			slots: [
				{ exercises: ['ex-lats-1'], id: 'slot-base', kind: 'base', label: 'Основные' },
				{
					exercises: ['ex-row-1', 'ex-neck-2'],
					id: 'slot-pool',
					kind: 'pool',
					label: 'Тяга',
					pick: 1,
					rule: 'правило из slots[]',
					secEach: 60
				}
			],
			slug: 'strength',
			title: 'Силовой'
		}
	],
	sessionBudgetMin: 70,
	sessionsPerWeek: 3,
	timing: {
		holdRestSec: 10,
		restSecAccessory: 60,
		restSecStrength: 70,
		transitionSec: 45,
		warmupGeneralMin: 5,
		workSecPerSet: 45
	},
	title: 'Программа: БАЗА + ПУЛ',
	volumes: [{ group: 'back', max: 14, min: 6 }]
});

export const catalogWithProgram = (program: SourceProgram = sourceProgram()): SourceCatalog => ({
	...sourceCatalog(),
	persons: [{ id: 'person-1', name: 'Sergei', programs: [PROGRAM_ID] }],
	programs: [program]
});
