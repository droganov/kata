import { describe, expect, it } from 'vitest';

import type { ExerciseRecord } from '../domain/exercise.ts';

import { findExercise } from './find-exercise.ts';
import { listExercises } from './list-exercises.ts';

const exerciseOf = (id: string, slug: string): Record<string, unknown> => ({
	constraints: { axial: false, free_weight: false, lumbar_ext: false, lumbar_flex: false },
	dose: '3×10',
	equipment: [{ id: 'body', role: 'main' }],
	id,
	mode: 'dynamic',
	name: slug,
	procedure: { id: `p-${id}`, steps: [] },
	slug,
	source: 'src',
	targets: [{ id: 't1', role: 'primary' }]
});

const records = [
	{
		bank: 'stretch',
		contourSlug: 'hip',
		contourTitle: 'бёдра',
		exercise: exerciseOf('e1', 'lunge')
	},
	{
		bank: 'stretch',
		contourSlug: 'hip',
		contourTitle: 'бёдра',
		exercise: exerciseOf('e2', 'frog')
	}
] as unknown as readonly ExerciseRecord[];

const repository = { readAll: () => records };

describe('findExercise и listExercises', () => {
	it('находит упражнение по идентификатору', () => {
		expect(findExercise(repository, 'e2')?.slug).toBe('frog');
	});

	it('молчит на неизвестном идентификаторе', () => {
		expect(findExercise(repository, 'e9')).toBeUndefined();
	});

	it('перечисляет все упражнения', () => {
		expect(listExercises(repository).map((view) => view.slug)).toEqual(['lunge', 'frog']);
	});
});
