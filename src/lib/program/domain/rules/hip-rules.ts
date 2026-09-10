import type { Finding } from '../finding.ts';
import type { PlanExercise } from '../plan-exercise.ts';
import type { ProgramPlan } from '../program-plan.ts';
import type { Slot } from '../program.ts';

import { holdSecondsOfDose } from '../dose-plan.ts';
import { PROGRAM_GOAL, programSubject, ruleCheck } from '../finding.ts';
import { planExercisesOf } from '../plan-exercise.ts';
import { hipPlanesOf, pickOf, SECTION_MODE } from '../program.ts';
import {
	baseExercisesOf,
	LIST_SEPARATOR,
	sectionsBeforeLoad,
	sessionExercisesWithMode
} from './rule-helpers.ts';

const RULE_DYNAMIC_HIP_BEFORE_LOAD = 'E6 DYNAMIC_HIP_BEFORE_LOAD';
const RULE_STATIC_HIP_AFTER_LOAD = 'E6 STATIC_HIP_AFTER_LOAD';
const RULE_NO_LONG_HOLD_BEFORE_LOAD = 'E6 NO_LONG_HOLD_BEFORE_LOAD';
const RULE_HIP_PLANES_COVERED = 'E6 HIP_PLANES_COVERED';
const RULE_HIP_STRETCH_PER_SESSION = 'E6 HIP_STRETCH_PER_SESSION';
const RULE_HIP_STRETCH_METHOD = 'E9 HIP_STRETCH_METHOD';
const HIP_MOBILITY_GOAL = 'hip_mobility';
const MIN_BASE_HIP_STRETCHES = 2;
const MIN_HIP_STRETCHES_PER_SESSION = 3;
const MAX_PRE_LOAD_HOLD_SEC = 60;
const MIN_PICK = 1;
const NO_SLOTS = 'нет слота динамической мобилизации бедра до силового раздела';
const NOT_COVERED = 'не покрыто: ';
const BY_SESSION = 'по занятиям: ';
const BASE_HIP_STRETCHES = ' статических растяжек бедра в базе';
const WITHOUT_PROCEDURE = 'без процедуры: ';

export function dynamicHipBeforeLoad(plan: ProgramPlan): readonly Finding[] {
	const slots = sectionsBeforeLoad(plan.program)
		.filter((section) => section.mode === SECTION_MODE.dynamic)
		.flatMap((section) => section.slots)
		.filter((slot) => isHipSlot(plan, slot));
	return ruleCheck(
		slots.length > 0,
		PROGRAM_GOAL.hip_mobility,
		RULE_DYNAMIC_HIP_BEFORE_LOAD,
		programSubject(plan.program),
		NO_SLOTS
	);
}

export function hipPlanesCovered(plan: ProgramPlan): readonly Finding[] {
	const covered = new Set(
		plan.sessions
			.flatMap((session) => sessionExercisesWithMode(session, SECTION_MODE.static_stretch))
			.flatMap((exercise) => (exercise.hipPlane === undefined ? [] : [exercise.hipPlane]))
	);
	const missing = hipPlanesOf(plan.program).filter((plane) => !covered.has(plane));
	return ruleCheck(
		missing.length === 0,
		PROGRAM_GOAL.hip_mobility,
		RULE_HIP_PLANES_COVERED,
		programSubject(plan.program),
		`${NOT_COVERED}${missing.join(LIST_SEPARATOR)}`
	);
}

export function hipStretchMethod(plan: ProgramPlan): readonly Finding[] {
	const lost = baseHipStretches(plan)
		.filter((exercise) => !exercise.hasProcedure)
		.map((exercise) => exercise.name);
	return ruleCheck(
		lost.length === 0,
		PROGRAM_GOAL.hip_mobility,
		RULE_HIP_STRETCH_METHOD,
		programSubject(plan.program),
		`${WITHOUT_PROCEDURE}${lost.join(LIST_SEPARATOR)}`
	);
}

export function hipStretchPerSession(plan: ProgramPlan): readonly Finding[] {
	const counts = plan.sessions.map(
		(session) =>
			sessionExercisesWithMode(session, SECTION_MODE.static_stretch).filter(
				(exercise) => exercise.hipPlane !== undefined
			).length
	);
	return ruleCheck(
		counts.every((count) => count >= MIN_HIP_STRETCHES_PER_SESSION),
		PROGRAM_GOAL.hip_mobility,
		RULE_HIP_STRETCH_PER_SESSION,
		programSubject(plan.program),
		`${BY_SESSION}${counts.map(String).join(LIST_SEPARATOR)}`
	);
}

export function noLongHoldBeforeLoad(plan: ProgramPlan): readonly Finding[] {
	const long = sectionsBeforeLoad(plan.program)
		.flatMap((section) => section.slots)
		.flatMap((slot) => planExercisesOf(slot.exercises, plan.exercises))
		.filter((exercise) => holdSecondsOfDose(exercise.dose) > MAX_PRE_LOAD_HOLD_SEC)
		.map((exercise) => exercise.name);
	return ruleCheck(
		long.length === 0,
		PROGRAM_GOAL.hip_mobility,
		RULE_NO_LONG_HOLD_BEFORE_LOAD,
		programSubject(plan.program),
		long.join(LIST_SEPARATOR)
	);
}

export function staticHipAfterLoad(plan: ProgramPlan): readonly Finding[] {
	const stretches = baseHipStretches(plan);
	return ruleCheck(
		stretches.length >= MIN_BASE_HIP_STRETCHES,
		PROGRAM_GOAL.hip_mobility,
		RULE_STATIC_HIP_AFTER_LOAD,
		programSubject(plan.program),
		`${String(stretches.length)}${BASE_HIP_STRETCHES}`
	);
}

function baseHipStretches(plan: ProgramPlan): readonly PlanExercise[] {
	return baseExercisesOf(plan, SECTION_MODE.static_stretch).filter(
		(exercise) =>
			exercise.goal === HIP_MOBILITY_GOAL && exercise.mode === SECTION_MODE.static_stretch
	);
}

function isHipSlot(plan: ProgramPlan, slot: Slot): boolean {
	if (pickOf(slot) < MIN_PICK) return false;
	const items = planExercisesOf(slot.exercises, plan.exercises);
	return (
		items.length > 0 &&
		items.every(
			(exercise) =>
				plan.hipMobilityExerciseIds.has(exercise.id) &&
				exercise.mode === SECTION_MODE.dynamic
		)
	);
}
