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

export const allCandidatesOf = (plan: ProgramPlan): readonly PlanExercise[] =>
	sectionSlotsOf(plan.program).flatMap(({ slot }) =>
		planExercisesOf(slot.exercises, plan.exercises)
	);

export const baseExercisesOf = (plan: ProgramPlan, mode: SectionMode): readonly PlanExercise[] =>
	sectionSlotsOf(plan.program)
		.filter(({ section, slot }) => section.mode === mode && slot.kind === SLOT_KIND.base)
		.flatMap(({ slot }) => planExercisesOf(slot.exercises, plan.exercises));

export const candidatesOf = (plan: ProgramPlan, mode: SectionMode): readonly PlanExercise[] =>
	sectionSlotsOf(plan.program)
		.filter(({ section }) => section.mode === mode)
		.flatMap(({ slot }) => planExercisesOf(slot.exercises, plan.exercises));

export const oneDecimal = (value: number): string => value.toFixed(DECIMALS);

export const sectionsBeforeLoad = (program: Program): readonly Section[] => {
	const at = program.sections.findIndex((section) => section.mode === SECTION_MODE.loaded);
	return at === NOT_FOUND ? [] : program.sections.slice(0, at);
};

export const sessionExercisesWithMode = (
	session: Session,
	mode: SectionMode
): readonly PlanExercise[] =>
	sessionSectionsWithMode(session, mode).flatMap((section) => sectionExercises(section));
