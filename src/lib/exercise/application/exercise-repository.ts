import type { ExerciseRecord } from '../domain/exercise.ts';

export interface ExerciseRepository {
	readAll: () => readonly ExerciseRecord[];
}
