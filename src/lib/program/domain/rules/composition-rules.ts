import type { Finding } from '../finding.ts';
import type { ProgramPlan } from '../program-plan.ts';

import { setsOfDose } from '../dose-plan.ts';
import { PROGRAM_GOAL, programSubject, ruleCheck } from '../finding.ts';
import { SECTION_MODE, volumeTargetsOf } from '../program.ts';
import { groupFrequencyOf, groupVolumeOf } from '../weekly-volume.ts';
import { candidatesOf, LIST_SEPARATOR, oneDecimal } from './rule-helpers.ts';

const RULE_MAJOR_GROUP_FREQUENCY = 'E1 MAJOR_GROUP_FREQUENCY';
const RULE_GROUP_VOLUME_CORRIDOR = 'E1 GROUP_VOLUME_CORRIDOR';
const RULE_MIN_SETS_PER_EXERCISE = 'E1 MIN_SETS_PER_EXERCISE';
const RULE_PROGRESSION_DECLARED = 'E5 PROGRESSION_DECLARED';
const MAJOR_GROUPS: readonly string[] = ['glutes', 'quads', 'hamstrings', 'back', 'chest', 'delts'];
const MIN_SESSIONS_PER_WEEK = 2;
const MIN_SETS = 2;
const PER_WEEK = '×/нед';
const NEED = ' нужно ';
const RANGE_DASH = '–';
const NO_PROGRESSION = 'не описана прогрессия базы или пула';

export function groupVolumeCorridor(plan: ProgramPlan): readonly Finding[] {
	const out = volumeTargetsOf(plan.program)
		.map((target) => ({ target, value: groupVolumeOf(plan.volume, target.group) }))
		.filter(({ target, value }) => value < target.min || value > target.max)
		.map(
			({ target, value }) =>
				`${target.group} ${oneDecimal(value)}${NEED}${String(target.min)}${RANGE_DASH}${String(target.max)}`
		);
	return ruleCheck(
		out.length === 0,
		PROGRAM_GOAL.body_composition,
		RULE_GROUP_VOLUME_CORRIDOR,
		programSubject(plan.program),
		out.join(LIST_SEPARATOR)
	);
}

export function majorGroupFrequency(plan: ProgramPlan): readonly Finding[] {
	const low = MAJOR_GROUPS.filter(
		(group) => groupFrequencyOf(plan.volume, group) < MIN_SESSIONS_PER_WEEK
	).map((group) => `${group} ${oneDecimal(groupFrequencyOf(plan.volume, group))}${PER_WEEK}`);
	return ruleCheck(
		low.length === 0,
		PROGRAM_GOAL.body_composition,
		RULE_MAJOR_GROUP_FREQUENCY,
		programSubject(plan.program),
		low.join(LIST_SEPARATOR)
	);
}

export function minSetsPerExercise(plan: ProgramPlan): readonly Finding[] {
	const thin = candidatesOf(plan, SECTION_MODE.loaded)
		.filter((exercise) => setsOfDose(exercise.dose) < MIN_SETS)
		.map((exercise) => `${exercise.slug} ${exercise.dose}`);
	return ruleCheck(
		thin.length === 0,
		PROGRAM_GOAL.body_composition,
		RULE_MIN_SETS_PER_EXERCISE,
		programSubject(plan.program),
		thin.join(LIST_SEPARATOR)
	);
}

export function progressionDeclared(plan: ProgramPlan): readonly Finding[] {
	const { progression } = plan.program;
	return ruleCheck(
		progression.base.length > 0 && progression.pool.length > 0,
		PROGRAM_GOAL.body_composition,
		RULE_PROGRESSION_DECLARED,
		programSubject(plan.program),
		NO_PROGRESSION
	);
}
