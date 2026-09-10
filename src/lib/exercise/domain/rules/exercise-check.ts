import type { ExerciseRecord } from '../exercise.ts';

export interface ExerciseCheck {
	readonly hasMainGear: boolean;
	readonly hasSource: boolean;
	readonly independentLines: ReadonlySet<string>;
	readonly knownTargetIds: ReadonlySet<string>;
	readonly record: ExerciseRecord;
	readonly shouldUseVerdicts: boolean;
}
