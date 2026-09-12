import type { Catalog, Exercise } from '../domain/catalog.ts';
import type { Program } from '../domain/program.ts';
import type { Session, SessionItem } from '../domain/session.ts';

import { blocksInOrder } from '../domain/program.ts';

const NO_EXERCISE = 'Упражнения нет в каталоге: ';

export interface ProgramCardView {
	readonly id: string;
	readonly title: string;
}

export interface SessionView {
	readonly blocks: readonly SessionBlockView[];
	readonly title: string;
}

interface SessionBlockView {
	readonly id: string;
	readonly items: readonly SessionItemView[];
	readonly name: string;
}

interface SessionItemView {
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
	session: Session
): SessionView => {
	const exercises = new Map(catalog.exercises.map((exercise) => [exercise.id, exercise]));
	return {
		blocks: blocksInOrder(program).map((block) => ({
			id: block.id,
			items: session.items
				.filter((item) => item.block === block.id)
				.map((item) => itemViewOf(item, exercises)),
			name: block.name
		})),
		title: program.title
	};
};

const itemViewOf = (
	item: SessionItem,
	exercises: ReadonlyMap<string, Exercise>
): SessionItemView => {
	const exercise = exercises.get(item.exercise);
	if (exercise === undefined) throw new Error(NO_EXERCISE + item.exercise);
	return { dose: item.dose, name: exercise.name, ord: item.ord };
};
