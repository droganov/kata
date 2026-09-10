import type { VerdictMerge } from '../application/apply-verdicts.ts';
import type { CounterLine } from '../application/counter-lines.ts';
import type { ExerciseView } from '../application/exercise-views.ts';
import type { ExerciseReport } from '../application/validate-exercises.ts';
import type { Verdict } from '../domain/verdict.ts';

import { applyVerdicts } from '../application/apply-verdicts.ts';
import { findExercise } from '../application/find-exercise.ts';
import { judgeQueue } from '../application/judge-queue.ts';
import { listExercises } from '../application/list-exercises.ts';
import { validateExercises } from '../application/validate-exercises.ts';
import { createCatalogJsonGateway } from '../infrastructure/catalog-json-gateway.ts';
import { createCryptoHasher } from '../infrastructure/crypto-hasher.ts';
import { EXERCISE_PATHS } from '../infrastructure/exercise-paths.ts';
import { createJsonExerciseRepository } from '../infrastructure/json-exercise-repository.ts';
import { createSchemaValidator } from '../infrastructure/json-schema-validator.ts';
import { createJsonSourceRepository } from '../infrastructure/json-source-repository.ts';
import { createJsonVerdictRepository } from '../infrastructure/json-verdict-repository.ts';

export interface ExerciseUseCases {
	applyVerdicts: (records: readonly Verdict[]) => VerdictMerge;
	findExercise: (id: string) => ExerciseView | undefined;
	judgeQueue: () => readonly CounterLine[];
	listExercises: () => readonly ExerciseView[];
	validateExercises: () => ExerciseReport;
}

export function createExercise(): ExerciseUseCases {
	const validator = createSchemaValidator(EXERCISE_PATHS.schema);
	const repositories = {
		catalog: createCatalogJsonGateway({
			equipmentFile: EXERCISE_PATHS.equipment,
			targetsFile: EXERCISE_PATHS.targets,
			validator
		}),
		exercises: createJsonExerciseRepository({ directory: EXERCISE_PATHS.banks, validator }),
		hasher: createCryptoHasher(),
		sources: createJsonSourceRepository({ file: EXERCISE_PATHS.sources, validator }),
		verdicts: createJsonVerdictRepository({ file: EXERCISE_PATHS.verdicts, validator })
	};
	return {
		applyVerdicts: (records) => applyVerdicts(repositories.verdicts, records),
		findExercise: (id) => findExercise(repositories.exercises, id),
		judgeQueue: () => judgeQueue(repositories),
		listExercises: () => listExercises(repositories.exercises),
		validateExercises: () => validateExercises(repositories)
	};
}
