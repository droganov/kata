import type { Catalog } from '../lib/session/domain/catalog.ts';
import type { ExerciseDetail } from '../lib/session/domain/exercise-detail.ts';
import type { Program } from '../lib/session/domain/program.ts';

export const CATALOG: Catalog = {
	exercises: [
		{
			catalogTarget: 'target-cardio',
			dose: '5 мин',
			id: 'ex-bike',
			modality: 'cardio',
			name: 'Велотренажёр',
			slug: 'bike'
		},
		{
			catalogTarget: 'target-cervical',
			dose: '2×10',
			id: 'ex-neck-roll',
			modality: 'dynamic',
			name: 'Круги головой',
			slug: 'neck_roll'
		},
		{
			catalogTarget: 'target-cervical',
			dose: '2×8',
			id: 'ex-neck-tilt',
			modality: 'dynamic',
			name: 'Наклоны головы',
			slug: 'neck_tilt'
		},
		{
			catalogTarget: 'target-neck-flexors',
			dose: '2×12',
			id: 'ex-neck-curl',
			modality: 'loaded',
			name: 'Сгибание шеи',
			slug: 'neck_curl'
		},
		{
			catalogTarget: 'target-chest',
			dose: '3×10',
			id: 'ex-press',
			modality: 'loaded',
			name: 'Жим в тренажёре',
			slug: 'press'
		},
		{
			catalogTarget: 'target-lats',
			dose: '3×12',
			id: 'ex-pulldown',
			modality: 'loaded',
			name: 'Тяга сверху',
			slug: 'pulldown'
		},
		{
			catalogTarget: 'target-rhomboids',
			dose: '3×12',
			id: 'ex-row',
			modality: 'loaded',
			name: 'Тяга к поясу',
			slug: 'row'
		},
		{
			catalogTarget: 'target-glutes',
			dose: '3×15',
			id: 'ex-bridge',
			modality: 'loaded',
			name: 'Ягодичный мост',
			slug: 'bridge'
		},
		{
			catalogTarget: 'target-glutes',
			dose: '40с × 2',
			id: 'ex-pigeon',
			modality: 'static_stretch',
			name: 'Голубь',
			slug: 'pigeon'
		}
	],
	muscleGroups: [
		{ id: 'group-neck', ord: 1 },
		{ id: 'group-chest', ord: 4 },
		{ id: 'group-back', ord: 5 },
		{ id: 'group-glutes', ord: 8 }
	],
	targets: [
		{ id: 'target-cardio', slug: 'cardiorespiratory' },
		{ id: 'target-cervical', muscleGroup: 'group-neck', slug: 'cervical_spine' },
		{ id: 'target-neck-flexors', muscleGroup: 'group-neck', slug: 'neck_flexors' },
		{ id: 'target-chest', muscleGroup: 'group-chest', slug: 'pectoralis_major_sternal' },
		{ id: 'target-lats', muscleGroup: 'group-back', slug: 'latissimus_dorsi' },
		{ id: 'target-rhomboids', muscleGroup: 'group-back', slug: 'rhomboids' },
		{ id: 'target-glutes', muscleGroup: 'group-glutes', slug: 'gluteus_maximus' }
	]
};

export const PROGRAM: Program = {
	blocks: [
		{
			draw: { count: 1, level: 'muscle_group', pickEach: 1 },
			id: 'block-strength',
			modality: 'loaded',
			name: 'Силовой',
			ord: 3,
			pinnedGroups: [
				{ id: 'group-chest', ord: 2, pick: 1 },
				{ id: 'group-glutes', ord: 1, pick: 1 }
			],
			pinnedTargets: []
		},
		{
			id: 'block-cardio',
			modality: 'cardio',
			name: 'Разогрев',
			ord: 1,
			pinnedGroups: [],
			pinnedTargets: [{ id: 'target-cardio', ord: 1, pick: 1 }]
		},
		{
			id: 'block-warmup',
			modality: 'dynamic',
			name: 'Разминка',
			ord: 2,
			pinnedGroups: [],
			pinnedTargets: [{ id: 'target-cervical', ord: 1, pick: 2 }]
		}
	],
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
