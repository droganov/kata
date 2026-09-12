import { describe, expect, it } from 'vitest';

import type { Exercise, ExerciseRecord } from '../domain/exercise.ts';

import { EXERCISE_BASE } from '../../../test/exercise-base.ts';
import { uuidOfLabel } from '../../../test/uuid.ts';
import { findExercise } from './find-exercise.ts';
import { listExercises } from './list-exercises.ts';

const exerciseOf = (id: string, slug: string): Exercise => ({
	...EXERCISE_BASE,
	constraints: { axial: false, free_weight: false, lumbar_ext: false, lumbar_flex: false },
	dose: '3×10',
	equipment: [{ id: uuidOfLabel('body'), role: 'main' }],
	id: uuidOfLabel(id),
	mode: 'dynamic',
	name: slug,
	procedure: { id: uuidOfLabel(`p-${id}`), steps: [] },
	slug,
	source: uuidOfLabel('src'),
	targets: [{ id: uuidOfLabel('t1'), role: 'primary' }]
});

const records: readonly ExerciseRecord[] = [
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
];

const repository = { readAll: () => records };

describe('findExercise и listExercises', () => {
	it('находит упражнение по идентификатору', () => {
		expect(findExercise(repository, uuidOfLabel('e2'))?.slug).toBe('frog');
	});

	it('молчит на неизвестном идентификаторе', () => {
		expect(findExercise(repository, uuidOfLabel('e9'))).toBeUndefined();
	});

	it('перечисляет все упражнения', () => {
		expect(listExercises(repository).map((view) => view.slug)).toEqual(['lunge', 'frog']);
	});
});
