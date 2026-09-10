import type { Finding } from './finding.ts';
import type { PlanExercises } from './plan-exercise.ts';
import type { Program } from './program.ts';
import type { Session } from './session.ts';
import type { WeeklyVolume } from './weekly-volume.ts';

import { sessionsOf } from './rotation.ts';
import { weeklyVolumeOf } from './weekly-volume.ts';

export interface ProgramPlan {
	readonly exercises: PlanExercises;
	readonly hipMobilityExerciseIds: ReadonlySet<string>;
	readonly program: Program;
	readonly sessions: readonly Session[];
	readonly volume: WeeklyVolume;
}

export type ProgramRule = (plan: ProgramPlan) => readonly Finding[];

export function programPlanOf(
	program: Program,
	exercises: PlanExercises,
	hipMobilityExerciseIds: ReadonlySet<string>
): ProgramPlan {
	const sessions = sessionsOf(program, exercises);
	return {
		exercises,
		hipMobilityExerciseIds,
		program,
		sessions,
		volume: weeklyVolumeOf(program, sessions)
	};
}
