import type { Catalog, Exercise } from '../domain/catalog.ts';
import type { DetailEntry, ExerciseDetail } from '../domain/exercise-detail.ts';
import type { Program } from '../domain/program.ts';
import type { Session, SessionItem } from '../domain/session.ts';

import { blocksInOrder } from '../domain/program.ts';

const NO_EXERCISE = 'Упражнения нет в каталоге: ';
const NO_DETAIL = 'У Упражнения нет процедуры в таблицах: ';
const ROLE_SEPARATOR = ' — ';
const LIST_SEPARATOR = ' · ';

export interface ProgramCardView {
	readonly id: string;
	readonly title: string;
}

export interface SessionView {
	readonly blocks: readonly SessionBlockView[];
	readonly seed: number;
	readonly title: string;
}

interface DetailStepView {
	readonly active: string;
	readonly id: string;
	readonly oracles: ExerciseDetail['steps'][number]['oracles'];
	readonly title: string;
}

interface ExerciseDetailView {
	readonly equipment: string;
	readonly note?: string;
	readonly steps: readonly DetailStepView[];
	readonly targets: string;
}

interface SessionBlockView {
	readonly id: string;
	readonly items: readonly SessionItemView[];
	readonly name: string;
}

interface SessionItemView {
	readonly detail: ExerciseDetailView;
	readonly dose: string;
	readonly name: string;
	readonly ord: number;
}

export const programCardOf = (program: Program): ProgramCardView => ({
	id: program.id,
	title: program.title
});

export const sessionViewOf = (
	program: Program,
	catalog: Catalog,
	session: Session,
	details: ReadonlyMap<string, ExerciseDetail>
): SessionView => {
	const exercises = new Map(catalog.exercises.map((exercise) => [exercise.id, exercise]));
	return {
		blocks: blocksInOrder(program).map((block) => ({
			id: block.id,
			items: session.items
				.filter((item) => item.block === block.id)
				.map((item) => itemViewOf(item, exercises, details)),
			name: block.name
		})),
		seed: session.seed,
		title: program.title
	};
};

const detailViewOf = (detail: ExerciseDetail): ExerciseDetailView => ({
	equipment: entriesOf(detail.equipment),
	...(detail.note !== undefined && { note: detail.note }),
	steps: detail.steps.map((step) => ({
		active: step.active.join(LIST_SEPARATOR),
		id: step.id,
		oracles: step.oracles,
		title: step.title
	})),
	targets: entriesOf(detail.targets)
});

const entriesOf = (entries: readonly DetailEntry[]): string =>
	entries.map((entry) => `${entry.name}${ROLE_SEPARATOR}${entry.role}`).join(LIST_SEPARATOR);

const itemViewOf = (
	item: SessionItem,
	exercises: ReadonlyMap<string, Exercise>,
	details: ReadonlyMap<string, ExerciseDetail>
): SessionItemView => {
	const exercise = exercises.get(item.exercise);
	if (exercise === undefined) throw new Error(NO_EXERCISE + item.exercise);
	const detail = details.get(item.exercise);
	if (detail === undefined) throw new Error(NO_DETAIL + item.exercise);
	return { detail: detailViewOf(detail), dose: item.dose, name: exercise.name, ord: item.ord };
};
