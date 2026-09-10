import type { ExerciseRecord } from '../domain/exercise.ts';
import type { Finding } from '../domain/finding.ts';
import type { ExerciseRepositories } from './exercise-repositories.ts';

import { exerciseInvariants } from '../domain/exercise-invariants.ts';
import { exerciseSubject, mainEquipmentIdsOf } from '../domain/exercise.ts';
import { findingsOf } from '../domain/finding.ts';
import { exerciseIssues } from '../domain/rules/exercise-rules.ts';
import { sourceIdsOf } from '../domain/source.ts';
import { counterLineKey, independentHashesOf } from '../domain/verdict.ts';
import { counterLinesOf } from './counter-lines.ts';

const BODY_KIND = 'body';

export interface ExerciseReport {
	readonly failureCount: number;
	readonly findings: readonly Finding[];
	readonly recordCount: number;
	readonly verdictCount: number;
}

export function validateExercises(repositories: ExerciseRepositories): ExerciseReport {
	const records = repositories.exercises.readAll();
	const verdicts = repositories.verdicts.readAll();
	const independentHashes = independentHashesOf(verdicts);
	const independentLines = new Set(
		counterLinesOf(records, repositories.hasher)
			.filter((counter) => independentHashes.has(counter.hash))
			.map((counter) => counterLineKey(counter.oracleId, counter.line))
	);
	const bodyIds = new Set(
		repositories.catalog
			.readEquipment()
			.filter((item) => item.kind === BODY_KIND)
			.map((item) => item.id)
	);
	const knownTargetIds = new Set(repositories.catalog.readTargets().map((target) => target.id));
	const sourceIds = sourceIdsOf(repositories.sources.readAll());
	const findings = records.flatMap((record) =>
		findingsOf(exerciseSubject(record), [
			...exerciseInvariants(record.exercise),
			...exerciseIssues({
				hasMainGear: hasMainGear(record, bodyIds),
				hasSource: sourceIds.has(record.exercise.source),
				independentLines,
				knownTargetIds,
				record,
				shouldUseVerdicts: true
			})
		])
	);
	return {
		failureCount: findings.length,
		findings,
		recordCount: records.length,
		verdictCount: verdicts.length
	};
}

function hasMainGear(record: ExerciseRecord, bodyIds: ReadonlySet<string>): boolean {
	return mainEquipmentIdsOf(record.exercise).some((id) => !bodyIds.has(id));
}
