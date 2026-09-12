import type { ExerciseRepository } from './exercise-repository.ts';
import type { ExerciseView } from './exercise-views.ts';

import { exerciseViewOf } from './exercise-views.ts';

export const findExercise = (
	repository: ExerciseRepository,
	id: string
): ExerciseView | undefined => {
	const found = repository.readAll().find((record) => record.exercise.id === id);
	return found === undefined ? undefined : exerciseViewOf(found.exercise);
};
