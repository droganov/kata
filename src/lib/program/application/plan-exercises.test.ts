import { describe, expect, it } from 'vitest';

import type { BankView, TargetView } from '../../catalog/application/catalog-views.ts';
import type { ExerciseView } from '../../exercise/application/exercise-views.ts';
import type { ProgramRepositories } from './program-repositories.ts';

import { planCatalogueOf } from './plan-exercises.ts';

const PROCEDURE = { id: 'proc', steps: [{ active: [], id: 'step', oracles: [], title: 'Шаг' }] };

const FULL = {
	constraints: {
		axial: false,
		free_weight: true,
		kg_max: 10,
		lumbar_ext: false,
		lumbar_flex: false
	},
	dose: '40с × 2',
	goal: 'hip_mobility',
	hipPlane: 'extension',
	id: 'st_hipflex',
	mode: 'static_stretch',
	name: 'Сгибатели бедра',
	plane: 'anterior',
	procedure: PROCEDURE,
	seconds: 100,
	slug: 'st_hipflex',
	targets: [
		{ id: 'target-1', role: 'primary' },
		{ id: 'target-nameless', role: 'secondary' },
		{ id: 'target-lost', role: 'stabilizer' }
	]
} as unknown as ExerciseView;

const BARE = {
	constraints: { axial: false, free_weight: false, lumbar_ext: false, lumbar_flex: false },
	dose: '3×12–15',
	id: 'leg_press',
	mode: 'loaded',
	name: 'Жим ногами',
	procedure: { id: 'proc', steps: [] },
	slug: 'leg_press',
	targets: []
} as unknown as ExerciseView;

const TARGETS = [
	{
		group: 'hip_flexors',
		id: 'target-1',
		kind: 'muscle',
		latin: 'iliacus',
		name: 'Илиакус',
		slug: 'iliacus',
		zone: 'Бёдра'
	},
	{
		id: 'target-nameless',
		kind: 'muscle',
		latin: 'x',
		name: 'Без группы',
		slug: 'x',
		zone: 'Бёдра'
	}
] as unknown as readonly TargetView[];

const BANKS = [
	{
		slug: 'warmup',
		title: 'Разминка',
		zones: [
			{
				contours: [
					{ exerciseIds: ['hip-1', 'hip-2'], id: 'c1', slug: 'hip', title: 'Бедро' },
					{ exerciseIds: ['knee-1'], id: 'c2', slug: 'knee_j', title: 'Колено' }
				],
				id: 'z1',
				slug: 'hips',
				title: 'Бёдра'
			}
		]
	}
] as unknown as readonly BankView[];

const repositoriesOf = (): ProgramRepositories =>
	({
		catalog: { readBanks: () => BANKS, readTargets: () => TARGETS },
		exercises: { readExercises: () => [FULL, BARE] }
	}) as unknown as ProgramRepositories;

describe('planCatalogueOf', () => {
	it('переносит всё нужное правилам из представлений упражнения', () => {
		const catalogue = planCatalogueOf(repositoriesOf());
		const full = catalogue.exercises.get('st_hipflex');
		expect(full).toEqual({
			constraints: {
				axial: false,
				free_weight: true,
				kg_max: 10,
				lumbar_ext: false,
				lumbar_flex: false
			},
			dose: '40с × 2',
			goal: 'hip_mobility',
			hasProcedure: true,
			hipPlane: 'extension',
			id: 'st_hipflex',
			mode: 'static_stretch',
			name: 'Сгибатели бедра',
			plane: 'anterior',
			seconds: 100,
			slug: 'st_hipflex',
			targets: [{ group: 'hip_flexors', role: 'primary' }]
		});
	});

	it('обходится без необязательных полей', () => {
		const bare = planCatalogueOf(repositoriesOf()).exercises.get('leg_press');
		expect(bare?.hasProcedure).toBe(false);
		expect(bare?.goal).toBeUndefined();
		expect(bare?.seconds).toBeUndefined();
		expect(bare?.plane).toBeUndefined();
		expect(bare?.hipPlane).toBeUndefined();
		expect(bare?.constraints.kg_max).toBeUndefined();
	});

	it('берёт упражнения подвижности бедра из контура банка', () => {
		expect([...planCatalogueOf(repositoriesOf()).hipMobilityExerciseIds]).toEqual([
			'hip-1',
			'hip-2'
		]);
	});
});
