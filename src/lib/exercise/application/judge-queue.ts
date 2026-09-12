import type { CounterLine } from './counter-lines.ts';
import type { ExerciseRepositories } from './exercise-repositories.ts';

import { independentHashesOf } from '../domain/verdict.ts';
import { counterLinesOf } from './counter-lines.ts';

export const judgeQueue = (
	repositories: Pick<ExerciseRepositories, 'exercises' | 'hasher' | 'verdicts'>
): readonly CounterLine[] => {
	const independentHashes = independentHashesOf(repositories.verdicts.readAll());
	return counterLinesOf(repositories.exercises.readAll(), repositories.hasher).filter(
		(counter) => !independentHashes.has(counter.hash)
	);
};
