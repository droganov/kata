import type { PlanExercise } from '../plan-exercise.ts';
import type { ProgramPlan } from '../program-plan.ts';
import type { Program, Section, SectionMode } from '../program.ts';
import type { Session } from '../session.ts';

import { planExercisesOf } from '../plan-exercise.ts';
import { SECTION_MODE, sectionSlotsOf, SLOT_KIND } from '../program.ts';
import { sectionExercises, sessionSectionsWithMode } from '../session.ts';

const DECIMALS = 1;
const NOT_FOUND = -1;

export const LIST_SEPARATOR = ', ';

export function allCandidatesOf(plan: ProgramPlan): readonly PlanExercise[] {
	return sectionSlotsOf(plan.program).flatMap(({ slot }) =>
		planExercisesOf(slot.exercises, plan.exercises)
	);
}

export function baseExercisesOf(plan: ProgramPlan, mode: SectionMode): readonly PlanExercise[] {
	return sectionSlotsOf(plan.program)
		.filter(({ section, slot }) => section.mode === mode && slot.kind === SLOT_KIND.base)
		.flatMap(({ slot }) => planExercisesOf(slot.exercises, plan.exercises));
}

export function candidatesOf(plan: ProgramPlan, mode: SectionMode): readonly PlanExercise[] {
	return sectionSlotsOf(plan.program)
		.filter(({ section }) => section.mode === mode)
		.flatMap(({ slot }) => planExercisesOf(slot.exercises, plan.exercises));
}

export function oneDecimal(value: number): string {
	return value.toFixed(DECIMALS);
}

export function sectionsBeforeLoad(program: Program): readonly Section[] {
	const at = program.sections.findIndex((section) => section.mode === SECTION_MODE.loaded);
	return at === NOT_FOUND ? [] : program.sections.slice(0, at);
}

export function sessionExercisesWithMode(
	session: Session,
	mode: SectionMode
): readonly PlanExercise[] {
	return sessionSectionsWithMode(session, mode).flatMap((section) => sectionExercises(section));
}
