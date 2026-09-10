import type { ExerciseRepository } from './exercise-repository.ts';
import type { ExerciseView } from './exercise-views.ts';

import { exerciseViewOf } from './exercise-views.ts';

export function listExercises(repository: ExerciseRepository): readonly ExerciseView[] {
	return repository.readAll().map((record) => exerciseViewOf(record.exercise));
}
