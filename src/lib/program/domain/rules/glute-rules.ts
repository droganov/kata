import type { Finding } from '../finding.ts';
import type { ProgramPlan } from '../program-plan.ts';

import { setsOfDose } from '../dose-plan.ts';
import { PROGRAM_GOAL, programSubject, ruleCheck } from '../finding.ts';
import { hasPrimaryGroup } from '../plan-exercise.ts';
import { SECTION_MODE, volumeTargetsOf } from '../program.ts';
import { groupVolumeOf } from '../weekly-volume.ts';
import { baseExercisesOf, oneDecimal } from './rule-helpers.ts';

const RULE_GLUTES_IN_BASE = 'E8 GLUTES_IN_BASE';
const RULE_GLUTES_VOLUME = 'E1 GLUTES_VOLUME';
const GLUTES_GROUP = 'glutes';
const MIN_BASE_GLUTE_SETS = 3;
const SETS_IN_BASE = ' прямых подходов в базе';
const CORRIDOR = ' подходов/нед, коридор ';
const RANGE_DASH = '–';

export function glutesInBase(plan: ProgramPlan): readonly Finding[] {
	const sets = baseExercisesOf(plan, SECTION_MODE.loaded)
		.filter((exercise) => hasPrimaryGroup(exercise, GLUTES_GROUP))
		.reduce((total, exercise) => total + setsOfDose(exercise.dose), 0);
	return ruleCheck(
		sets >= MIN_BASE_GLUTE_SETS,
		PROGRAM_GOAL.glutes,
		RULE_GLUTES_IN_BASE,
		programSubject(plan.program),
		`${String(sets)}${SETS_IN_BASE}`
	);
}

export function glutesWeeklyVolume(plan: ProgramPlan): readonly Finding[] {
	const target = volumeTargetsOf(plan.program).find((item) => item.group === GLUTES_GROUP);
	if (target === undefined) return [];
	const value = groupVolumeOf(plan.volume, GLUTES_GROUP);
	return ruleCheck(
		value >= target.min && value <= target.max,
		PROGRAM_GOAL.glutes,
		RULE_GLUTES_VOLUME,
		programSubject(plan.program),
		`${oneDecimal(value)}${CORRIDOR}${String(target.min)}${RANGE_DASH}${String(target.max)}`
	);
}
