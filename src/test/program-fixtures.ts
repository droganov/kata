import type { BankView, TargetView } from '../lib/catalog/application/catalog-views.ts';
import type { ExerciseView } from '../lib/exercise/application/exercise-views.ts';
import type { ProgramRepositories } from '../lib/program/application/program-repositories.ts';
import type { Program, User } from '../lib/program/domain/program.ts';

import { uuidOfLabel } from './uuid.ts';

const exerciseViewOf = (id: string): ExerciseView => ({
	constraints: { axial: false, free_weight: false, lumbar_ext: false, lumbar_flex: false },
	dose: '3×12–15',
	equipment: [],
	id,
	mode: 'loaded',
	name: id,
	procedure: { id: uuidOfLabel('proc'), steps: [] },
	slug: id,
	targets: [{ id: uuidOfLabel('target-1'), role: 'primary' }]
});

const TARGETS: readonly TargetView[] = [
	{
		group: 'glutes',
		id: 'target-1',
		kind: 'muscle',
		latin: 'gluteus',
		name: 'Ягодичная',
		slug: 'gluteus_maximus',
		zone: 'Ягодичные'
	}
];

const BANKS: readonly BankView[] = [
	{
		slug: 'strength',
		title: 'Силовой банк',
		zones: [
			{
				contours: [
					{ exerciseIds: ['c', 'b'], id: 'contour-1', slug: 'knee', title: 'колено' }
				],
				id: 'zone-1',
				slug: 'thighs',
				title: 'Бёдра'
			}
		]
	}
];

const PROGRAM: Program = {
	contraindications: {
		axial_load: true,
		free_weight_kg_max: 10,
		loaded_lumbar_extension: true,
		loaded_lumbar_flexion: true
	},
	goals: { primary: ['glutes'], secondary: ['strength'] },
	id: 'program-1',
	progression: { base: 'b', isometric: '15с', pool: 'p', stop_rule: 's' },
	schedule: { rotation_weeks: 1, session_budget_min: 70, sessions_per_week: 2 },
	sections: [
		{
			bank: 'bank',
			id: 'strength',
			mode: 'loaded',
			slots: [
				{ exercises: ['a'], id: 'base', kind: 'base', label: 'База' },
				{
					allow_repeat: false,
					exercises: ['b', 'c'],
					id: 'pool',
					kind: 'pool',
					label: 'Пул',
					pick: 1
				}
			],
			slug: 'strength',
			title: 'Силовой'
		}
	],
	timing: {
		hold_rest_sec: 10,
		rest_sec_accessory: 60,
		rest_sec_strength: 70,
		transition_sec: 45,
		work_sec_per_set: 45
	},
	title: 'Программа',
	user: 'user-1'
};

const USERS: readonly User[] = [
	{ id: 'user-1', name: 'Сергей', programs: ['program-1'] },
	{ id: 'user-2', name: 'Гость', programs: [] }
];

export const REPOSITORIES: ProgramRepositories = {
	catalog: { readBanks: () => BANKS, readTargets: () => TARGETS },
	exercises: { readExercises: () => ['a', 'b', 'c'].map((id) => exerciseViewOf(id)) },
	programs: { readAll: () => [PROGRAM] },
	users: { readAll: () => USERS }
};
