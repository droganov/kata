import type { Program } from '../domain/program.ts';
import type { Session } from '../domain/session.ts';

export interface ProgramView {
	readonly goals: ProgramGoalsView;
	readonly id: string;
	readonly rotationWeeks: number;
	readonly sections: readonly ProgramSectionView[];
	readonly sessionBudgetMin: number;
	readonly sessionsPerWeek: number;
	readonly title: string;
	readonly user: string;
}

export interface SessionView {
	readonly index: number;
	readonly minutes: number;
	readonly sections: readonly SessionSectionView[];
	readonly slug: string;
	readonly title: string;
}

interface ProgramGoalsView {
	readonly primary: readonly string[];
	readonly secondary: readonly string[];
}

interface ProgramSectionView {
	readonly mode: string;
	readonly slotCount: number;
	readonly slug: string;
	readonly title: string;
}

interface SessionExerciseView {
	readonly dose: string;
	readonly id: string;
	readonly name: string;
	readonly slug: string;
}

interface SessionSectionView {
	readonly mode: string;
	readonly slots: readonly SessionSlotView[];
	readonly slug: string;
	readonly title: string;
}

interface SessionSlotView {
	readonly exercises: readonly SessionExerciseView[];
	readonly kind: string;
	readonly label: string;
}

export const programViewOf = (program: Program): ProgramView => ({
	goals: { primary: program.goals.primary, secondary: program.goals.secondary },
	id: program.id,
	rotationWeeks: program.schedule.rotation_weeks,
	sections: program.sections.map((section) => ({
		mode: section.mode,
		slotCount: section.slots.length,
		slug: section.slug,
		title: section.title
	})),
	sessionBudgetMin: program.schedule.session_budget_min,
	sessionsPerWeek: program.schedule.sessions_per_week,
	title: program.title,
	user: program.user
});

export const sessionViewOf = (session: Session): SessionView => ({
	index: session.index,
	minutes: session.minutes,
	sections: session.sections.map((section) => ({
		mode: section.mode,
		slots: section.slots.map((slot) => ({
			exercises: slot.exercises.map((exercise) => ({
				dose: exercise.dose,
				id: exercise.id,
				name: exercise.name,
				slug: exercise.slug
			})),
			kind: slot.kind,
			label: slot.label
		})),
		slug: section.slug,
		title: section.title
	})),
	slug: session.slug,
	title: session.title
});
