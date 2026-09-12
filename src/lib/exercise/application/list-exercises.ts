import type { ExerciseRepository } from './exercise-repository.ts';
import type { ExerciseView } from './exercise-views.ts';

import { exerciseViewOf } from './exercise-views.ts';

export const listExercises = (repository: ExerciseRepository): readonly ExerciseView[] =>
	repository.readAll().map((record) => exerciseViewOf(record.exercise));
