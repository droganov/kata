import type { Catalog, Exercise } from '../lib/session/domain/catalog.ts';
import type { ExerciseDetail } from '../lib/session/domain/exercise-detail.ts';
import type { BlockPair, Program } from '../lib/session/domain/program.ts';

type Limits = Partial<
	Pick<Exercise, 'axial' | 'freeWeight' | 'kgMax' | 'lumbarExt' | 'lumbarFlex'>
>;

const exerciseOf = (
	id: string,
	catalogTarget: string,
	modality: string,
	name: string,
	limits: Limits = {}
): Exercise => ({
	axial: false,
	catalogTarget,
	dose: '3×12',
	freeWeight: false,
	id,
	lumbarExt: false,
	lumbarFlex: false,
	modality,
	name,
	slug: id.replace('ex-', ''),
	...limits
});

export const FORBIDDEN_EXERCISES = [
	'ex-deadlift',
	'ex-crunch',
	'ex-good-morning',
	'ex-dumbbell-row',
	'ex-swing'
];

export const CATALOG: Catalog = {
	exercises: [
		{ ...exerciseOf('ex-bike', 'target-cardio', 'cardio', 'Велотренажёр'), dose: '5 мин' },
		{
			...exerciseOf('ex-neck-roll', 'target-cervical', 'dynamic', 'Круги головой'),
			dose: '2×10'
		},
		{
			...exerciseOf('ex-neck-tilt', 'target-cervical', 'dynamic', 'Наклоны головы'),
			dose: '2×8'
		},
		exerciseOf('ex-neck-curl', 'target-neck-flexors', 'loaded', 'Сгибание шеи'),
		{ ...exerciseOf('ex-press', 'target-chest', 'loaded', 'Жим в тренажёре'), dose: '3×10' },
		exerciseOf('ex-fly', 'target-chest', 'loaded', 'Сведение в тренажёре'),
		exerciseOf('ex-pulldown', 'target-lats', 'loaded', 'Тяга сверху'),
		exerciseOf('ex-row', 'target-rhomboids', 'loaded', 'Тяга к поясу'),
		exerciseOf('ex-dumbbell-row', 'target-rhomboids', 'loaded', 'Тяга гантели', {
			freeWeight: true,
			kgMax: 16
		}),
		exerciseOf('ex-good-morning', 'target-erectors', 'loaded', 'Гуд морнинг', {
			lumbarExt: true
		}),
		exerciseOf('ex-crunch', 'target-rectus', 'loaded', 'Скручивание с весом', {
			lumbarFlex: true
		}),
		{ ...exerciseOf('ex-bridge', 'target-glutes', 'loaded', 'Ягодичный мост'), dose: '3×15' },
		exerciseOf('ex-deadlift', 'target-glutes', 'loaded', 'Становая тяга', { axial: true }),
		exerciseOf('ex-abduction', 'target-glute-med', 'loaded', 'Отведение бедра'),
		exerciseOf('ex-leg-press', 'target-quads', 'loaded', 'Жим ногами'),
		exerciseOf('ex-goblet-squat', 'target-quads', 'loaded', 'Гоблет-присед', {
			freeWeight: true,
			kgMax: 10
		}),
		exerciseOf('ex-swing', 'target-quads', 'loaded', 'Мах гирей', { freeWeight: true }),
		{
			...exerciseOf('ex-pigeon', 'target-glutes', 'static_stretch', 'Голубь'),
			dose: '40с × 2'
		},
		exerciseOf('ex-pec-stretch', 'target-chest', 'static_stretch', 'Растяжка грудной'),
		exerciseOf('ex-lat-stretch', 'target-lats', 'static_stretch', 'Растяжка широчайшей'),
		exerciseOf('ex-quad-stretch', 'target-quads', 'static_stretch', 'Растяжка квадрицепса'),
		exerciseOf(
			'ex-hamstring-stretch',
			'target-hamstrings',
			'static_stretch',
			'Растяжка бицепса бедра'
		)
	],
	muscleGroups: [
		{ id: 'group-neck', ord: 1 },
		{ id: 'group-chest', ord: 4 },
		{ id: 'group-back', ord: 5 },
		{ id: 'group-core', ord: 7 },
		{ id: 'group-glutes', ord: 8 },
		{ id: 'group-legs', ord: 9 }
	],
	targets: [
		{ id: 'target-cardio', slug: 'cardiorespiratory' },
		{ id: 'target-cervical', muscleGroup: 'group-neck', slug: 'cervical_spine' },
		{ id: 'target-neck-flexors', muscleGroup: 'group-neck', slug: 'neck_flexors' },
		{ id: 'target-chest', muscleGroup: 'group-chest', slug: 'pectoralis_major_sternal' },
		{ id: 'target-lats', muscleGroup: 'group-back', slug: 'latissimus_dorsi' },
		{ id: 'target-rhomboids', muscleGroup: 'group-back', slug: 'rhomboids' },
		{ id: 'target-erectors', muscleGroup: 'group-back', slug: 'erector_spinae' },
		{ id: 'target-rectus', muscleGroup: 'group-core', slug: 'rectus_abdominis' },
		{ id: 'target-glutes', muscleGroup: 'group-glutes', slug: 'gluteus_maximus' },
		{ id: 'target-glute-med', muscleGroup: 'group-glutes', slug: 'gluteus_medius' },
		{ id: 'target-quads', muscleGroup: 'group-legs', slug: 'quadriceps' },
		{ id: 'target-hamstrings', muscleGroup: 'group-legs', slug: 'hamstrings' }
	]
};

export const STRETCH_PAIRS: readonly BlockPair[] = [
	{ thenTarget: 'target-chest', whenGroup: 'group-chest' },
	{ thenTarget: 'target-lats', whenGroup: 'group-back' },
	{ thenTarget: 'target-quads', whenGroup: 'group-legs' },
	{ thenTarget: 'target-hamstrings', whenGroup: 'group-legs' }
];

export const PROGRAM: Program = {
	blocks: [
		{
			draw: { count: 2, level: 'muscle_group', pickEach: 1 },
			id: 'block-strength',
			modality: 'loaded',
			name: 'Силовой',
			ord: 3,
			pairs: [],
			pinnedGroups: [
				{ id: 'group-chest', ord: 2, pick: 1 },
				{ id: 'group-glutes', ord: 1, pick: 1 }
			],
			pinnedTargets: []
		},
		{
			id: 'block-stretch',
			modality: 'static_stretch',
			name: 'Растяжка',
			ord: 4,
			pairs: STRETCH_PAIRS,
			pinnedGroups: [{ id: 'group-glutes', ord: 1, pick: 1 }],
			pinnedTargets: []
		},
		{
			id: 'block-cardio',
			modality: 'cardio',
			name: 'Разогрев',
			ord: 1,
			pairs: [],
			pinnedGroups: [],
			pinnedTargets: [{ id: 'target-cardio', ord: 1, pick: 1 }]
		},
		{
			id: 'block-warmup',
			modality: 'dynamic',
			name: 'Разминка',
			ord: 2,
			pairs: [],
			pinnedGroups: [],
			pinnedTargets: [{ id: 'target-cervical', ord: 1, pick: 2 }]
		}
	],
	contraindications: {
		freeWeightKgMax: 10,
		noAxialLoad: true,
		noLumbarExtension: true,
		noLumbarFlexion: true
	},
	id: 'program-1',
	title: 'Закрепления и добор'
};

const PLAIN_DETAIL: ExerciseDetail = {
	equipment: [{ name: 'Тело', role: 'main' }],
	steps: [],
	targets: [{ name: 'Шея', role: 'primary' }]
};

export const DETAILS: ReadonlyMap<string, ExerciseDetail> = new Map(
	CATALOG.exercises.map((exercise) => [
		exercise.id,
		exercise.id === 'ex-neck-roll'
			? {
					...PLAIN_DETAIL,
					note: 'медленно',
					steps: [
						{
							active: ['Шея', 'Трапеция'],
							id: 'step-1',
							oracles: [
								{
									counterModel: ['рывок'],
									id: 'oracle-1',
									model: ['плавно'],
									predicate: 'Плечи опущены'
								}
							],
							title: 'Наклон'
						}
					]
				}
			: PLAIN_DETAIL
	])
);

export const GATEWAYS = {
	catalog: { readCatalog: () => CATALOG },
	details: { readDetails: () => DETAILS },
	programs: { readPrograms: () => [PROGRAM] }
};
