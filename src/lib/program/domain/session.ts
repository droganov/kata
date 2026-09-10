import type { PlanExercise } from './plan-exercise.ts';
import type { SectionMode } from './program.ts';

export interface Session {
	readonly index: number;
	readonly minutes: number;
	readonly program: string;
	readonly sections: readonly SessionSection[];
	readonly slug: string;
	readonly title: string;
}

export interface SessionSection {
	readonly mode: SectionMode;
	readonly section: string;
	readonly slots: readonly SessionSlot[];
	readonly slug: string;
	readonly title: string;
}

export interface SessionSlot {
	readonly exercises: readonly PlanExercise[];
	readonly kind: string;
	readonly label: string;
	readonly slot: string;
}

export function sectionExercises(section: SessionSection): readonly PlanExercise[] {
	return section.slots.flatMap((slot) => slot.exercises);
}

export function sessionSectionsWithMode(
	session: Session,
	mode: SectionMode
): readonly SessionSection[] {
	return session.sections.filter((section) => section.mode === mode);
}
