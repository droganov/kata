import type { Program, Section, Slot } from './program.ts';

const SUBJECT_SEPARATOR = ':';
const PATH_SEPARATOR = '/';

export const PROGRAM_GOAL = {
	body_composition: 'body_composition',
	constraints: 'constraints',
	glutes: 'glutes',
	hip_mobility: 'hip_mobility',
	lumbar_stiffness: 'lumbar_stiffness',
	secondary: 'secondary',
	structure: 'structure'
} as const;

export interface Finding {
	readonly goal: ProgramGoal;
	readonly message: string;
	readonly rule: string;
	readonly subject: string;
}

export type ProgramGoal = (typeof PROGRAM_GOAL)[keyof typeof PROGRAM_GOAL];

export function checkedGoals(): readonly ProgramGoal[] {
	return Object.values(PROGRAM_GOAL);
}

export function programSubject(program: Program): string {
	return program.title;
}

export function ruleCheck(
	isPassing: boolean,
	goal: ProgramGoal,
	rule: string,
	subject: string,
	message: string
): readonly Finding[] {
	return isPassing ? [] : [{ goal, message, rule, subject }];
}

export function slotSubject(program: Program, section: Section, slot: Slot): string {
	return `${program.title}${SUBJECT_SEPARATOR}${section.slug}${PATH_SEPARATOR}${slot.label}`;
}
