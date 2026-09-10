import type { PlanExercise } from './plan-exercise.ts';
import type { Program } from './program.ts';
import type { Session } from './session.ts';

import { setsOfDose } from './dose-plan.ts';
import { groupWeightsOf } from './plan-exercise.ts';
import { SECTION_MODE } from './program.ts';
import { sectionExercises, sessionSectionsWithMode } from './session.ts';

const FREQUENCY_MIN_WEIGHT = 0.3;
const NOTHING = 0;

export interface WeeklyVolume {
	readonly frequency: ReadonlyMap<string, number>;
	readonly volume: ReadonlyMap<string, number>;
}

export function groupFrequencyOf(weekly: WeeklyVolume, group: string): number {
	return weekly.frequency.get(group) ?? NOTHING;
}

export function groupVolumeOf(weekly: WeeklyVolume, group: string): number {
	return weekly.volume.get(group) ?? NOTHING;
}

export function weeklyVolumeOf(program: Program, sessions: readonly Session[]): WeeklyVolume {
	const totals = new Map<string, number>();
	const days = new Map<string, Set<number>>();
	for (const session of sessions)
		for (const section of sessionSectionsWithMode(session, SECTION_MODE.loaded))
			for (const exercise of sectionExercises(section))
				addExercise(totals, days, exercise, session.index);
	const weeks = program.schedule.rotation_weeks;
	return {
		frequency: new Map([...days].map(([group, seen]) => [group, seen.size / weeks])),
		volume: new Map([...totals].map(([group, total]) => [group, total / weeks]))
	};
}

function addExercise(
	totals: Map<string, number>,
	days: Map<string, Set<number>>,
	exercise: PlanExercise,
	index: number
): void {
	const sets = setsOfDose(exercise.dose);
	for (const [group, weight] of groupWeightsOf(exercise)) {
		totals.set(group, (totals.get(group) ?? NOTHING) + sets * weight);
		if (weight < FREQUENCY_MIN_WEIGHT) continue;
		const seen = days.get(group) ?? new Set<number>();
		seen.add(index);
		days.set(group, seen);
	}
}
