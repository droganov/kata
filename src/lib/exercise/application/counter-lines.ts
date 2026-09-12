import type { Uuid } from '../../shared/uuid.ts';
import type { ExerciseRecord, Oracle, Step } from '../domain/exercise.ts';
import type { Hasher } from './hasher.ts';

import { stepPredicatesOf } from '../domain/exercise.ts';
import { verdictHashText } from '../domain/verdict.ts';

export interface CounterLine {
	readonly exerciseSlug: string;
	readonly hash: string;
	readonly line: string;
	readonly oracleId: Uuid;
	readonly predicate: string;
	readonly stepModel: readonly string[];
	readonly stepPredicates: readonly string[];
	readonly stepTitle: string;
}

export const counterLinesOf = (
	records: readonly ExerciseRecord[],
	hasher: Hasher
): readonly CounterLine[] =>
	records.flatMap((record) =>
		record.exercise.procedure.steps.flatMap((step) =>
			stepCounterLines(record.exercise.slug, step, hasher)
		)
	);

const oracleCounterLines = (
	exerciseSlug: string,
	step: Step,
	oracle: Oracle,
	hasher: Hasher
): readonly CounterLine[] => {
	const stepPredicates = stepPredicatesOf(step);
	const stepModel = step.oracles.flatMap((each) => each.model);
	const hashModel = [...stepPredicates, ...stepModel];
	return oracle.counterModel.map((line) => ({
		exerciseSlug,
		hash: hasher.digest(verdictHashText(oracle.predicate, hashModel, line)),
		line,
		oracleId: oracle.id,
		predicate: oracle.predicate,
		stepModel,
		stepPredicates,
		stepTitle: step.title
	}));
};

const stepCounterLines = (
	exerciseSlug: string,
	step: Step,
	hasher: Hasher
): readonly CounterLine[] =>
	step.oracles.flatMap((oracle) => oracleCounterLines(exerciseSlug, step, oracle, hasher));
