import type { Finding } from '../finding.ts';
import type { ProgramPlan } from '../program-plan.ts';
import type { Section, Slot } from '../program.ts';

import { PROGRAM_GOAL, programSubject, ruleCheck, slotSubject } from '../finding.ts';
import { planExercisesOf } from '../plan-exercise.ts';
import {
	CORE_PLANE,
	hipPlanesOf,
	pickOf,
	rotationLength,
	sectionSlotsOf,
	SLOT_KIND
} from '../program.ts';
import { HIP_PLANE_RULE, LATERAL_RULE } from '../rotation.ts';
import { allCandidatesOf, LIST_SEPARATOR } from './rule-helpers.ts';

const RULE_FREE_WEIGHT_LIMIT = 'E7 FREE_WEIGHT_LIMIT';
const RULE_SESSION_TIME_BUDGET = 'E8 SESSION_TIME_BUDGET';
const RULE_SLOT_DEPTH = 'E8 SLOT_DEPTH';
const MIN_SESSION_MINUTES = 60;
const UNKNOWN_KG = Infinity;
const MINUTES_MARK = ' мин';
const PLANE_EMPTY = ' — направление без кандидатов: ';
const DEPTH_SHORT = ' кандидатов при нужных ';

export const freeWeightLimit = (plan: ProgramPlan): readonly Finding[] => {
	const limit = plan.program.contraindications.free_weight_kg_max;
	const over = allCandidatesOf(plan)
		.filter(
			(exercise) =>
				exercise.constraints.free_weight &&
				(exercise.constraints.kg_max ?? UNKNOWN_KG) > limit
		)
		.map((exercise) => exercise.name);
	return ruleCheck(
		over.length === 0,
		PROGRAM_GOAL.constraints,
		RULE_FREE_WEIGHT_LIMIT,
		programSubject(plan.program),
		over.join(LIST_SEPARATOR)
	);
};

export const sessionTimeBudget = (plan: ProgramPlan): readonly Finding[] => {
	const budget = plan.program.schedule.session_budget_min;
	const minutes = plan.sessions.map((session) => session.minutes);
	return ruleCheck(
		minutes.every((value) => value >= MIN_SESSION_MINUTES && value <= budget),
		PROGRAM_GOAL.constraints,
		RULE_SESSION_TIME_BUDGET,
		programSubject(plan.program),
		`${minutes.map(String).join(LIST_SEPARATOR)}${MINUTES_MARK}`
	);
};

export const slotDepth = (plan: ProgramPlan): readonly Finding[] => {
	const need = rotationLength(plan.program);
	return sectionSlotsOf(plan.program)
		.filter(({ slot }) => slot.kind === SLOT_KIND.pool && slot.allow_repeat !== true)
		.flatMap(({ section, slot }) => depthFindings(plan, section, slot, need));
};

const depthFindings = (
	plan: ProgramPlan,
	section: Section,
	slot: Slot,
	need: number
): readonly Finding[] => {
	const candidates = planExercisesOf(slot.exercises, plan.exercises);
	const subject = slotSubject(plan.program, section, slot);
	if (slot.rule === HIP_PLANE_RULE) {
		const empty = hipPlanesOf(plan.program).filter((plane) =>
			candidates.every((exercise) => exercise.hipPlane !== plane)
		);
		return ruleCheck(
			empty.length === 0,
			PROGRAM_GOAL.constraints,
			RULE_SLOT_DEPTH,
			subject,
			`${slot.label}${PLANE_EMPTY}${empty.join(LIST_SEPARATOR)}`
		);
	}
	const wanted = need * (pickOf(slot) - (slot.rule === LATERAL_RULE ? 1 : 0));
	const deep =
		slot.rule === LATERAL_RULE
			? candidates.filter((exercise) => exercise.plane !== CORE_PLANE.lateral).length
			: candidates.length;
	return ruleCheck(
		deep >= wanted,
		PROGRAM_GOAL.constraints,
		RULE_SLOT_DEPTH,
		subject,
		`${slot.label}: ${String(deep)}${DEPTH_SHORT}${String(wanted)}`
	);
};
