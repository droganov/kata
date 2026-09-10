import type { ExerciseView } from '../../exercise/application/exercise-views.ts';

export interface ExerciseGateway {
	readExercises: () => readonly ExerciseView[];
}
