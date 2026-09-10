import type { ExerciseView } from '../../exercise/application/exercise-views.ts';

export interface ExerciseGateway {
	find: (id: string) => ExerciseView | undefined;
	readAll: () => readonly ExerciseView[];
}
