import type { Catalog } from '../domain/catalog.ts';
import type { DetailEntry, ExerciseDetail } from '../domain/exercise-detail.ts';
import type { Program } from '../domain/program.ts';
import type { RedrawOptions, Rejected } from '../domain/redraw.ts';
import type { Session, SessionItem } from '../domain/session.ts';

import { blocksInOrder } from '../domain/program.ts';
import { NOTHING_REJECTED, redrawOptionsOf } from '../domain/redraw.ts';

const NO_EXERCISE = 'Упражнения нет в каталоге: ';
const NO_DETAIL = 'У Упражнения нет процедуры в таблицах: ';
const FIRST_DRAW = 1;
const NAME_SEPARATOR = ', ';
const UNKNOWN_ROLE = 'Неизвестный код роли: ';

const EQUIPMENT_ROLES: Readonly<Record<string, string>> = {
	auxiliary: 'вспомогательное',
	main: 'главное'
};

const TARGET_ROLES: Readonly<Record<string, string>> = {
	primary: 'Первичные',
	secondary: 'Вторичные',
	stabilizer: 'Стабилизаторы'
};

export interface ProgramCardView {
	readonly account: string;
	readonly id: string;
	readonly title: string;
}

export interface Redrawn {
	readonly item: SessionItemView;
	readonly options: readonly RedrawOptions[];
	readonly rejected: Rejected;
}

export interface SessionItemView {
	readonly detail: ExerciseDetailView;
	readonly dose: string;
	readonly drawNo: number;
	readonly exercise: string;
	readonly isExerciseRedrawable: boolean;
	readonly isTargetRedrawable: boolean;
	readonly name: string;
	readonly ord: number;
	readonly target: string;
}

export interface SessionView {
	readonly blocks: readonly SessionBlockView[];
	readonly program: string;
	readonly seed: number;
	readonly title: string;
}

interface DetailStepView {
	readonly id: string;
	readonly oracles: ExerciseDetail['steps'][number]['oracles'];
	readonly title: string;
}

interface EquipmentView {
	readonly name: string;
	readonly role: string;
}

interface ExerciseDetailView {
	readonly equipment: readonly EquipmentView[];
	readonly note?: string;
	readonly steps: readonly DetailStepView[];
	readonly targets: readonly TargetRoleView[];
}

interface SessionBlockView {
	readonly id: string;
	readonly items: readonly SessionItemView[];
	readonly name: string;
}

interface TargetRoleView {
	readonly names: string;
	readonly role: string;
}

export const programCardOf = (program: Program): ProgramCardView => ({
	account: program.account,
	id: program.id,
	title: program.title
});

export const sessionViewOf = (
	program: Program,
	catalog: Catalog,
	session: Session,
	details: ReadonlyMap<string, ExerciseDetail>
): SessionView => {
	const options = redrawOptionsOf(program, catalog, session.items, NOTHING_REJECTED);
	return {
		blocks: blocksInOrder(program).map((block) => ({
			id: block.id,
			items: session.items
				.filter((item) => item.block === block.id)
				.map((item) =>
					sessionItemViewOf(
						catalog,
						item,
						details,
						options.find((candidate) => candidate.ord === item.ord)
					)
				),
			name: block.name
		})),
		program: program.id,
		seed: session.seed,
		title: program.title
	};
};

const detailViewOf = (detail: ExerciseDetail): ExerciseDetailView => ({
	equipment: detail.equipment.map((entry) => ({
		name: entry.name,
		role: roleNameOf(EQUIPMENT_ROLES, entry)
	})),
	...(detail.note !== undefined && { note: detail.note }),
	steps: detail.steps.map((step) => ({ id: step.id, oracles: step.oracles, title: step.title })),
	targets: targetRolesOf(detail.targets)
});

const roleNameOf = (roles: Readonly<Record<string, string>>, entry: DetailEntry): string => {
	const name = roles[entry.role];
	if (name === undefined) throw new Error(UNKNOWN_ROLE + entry.role);
	return name;
};

const targetRolesOf = (targets: readonly DetailEntry[]): readonly TargetRoleView[] => {
	const named = targets.map((target) => ({
		name: target.name,
		role: roleNameOf(TARGET_ROLES, target)
	}));
	return Object.values(TARGET_ROLES).flatMap((role) => {
		const names = named.filter((target) => target.role === role).map((target) => target.name);
		return names.length === 0 ? [] : [{ names: names.join(NAME_SEPARATOR), role }];
	});
};

export const sessionItemViewOf = (
	catalog: Catalog,
	item: SessionItem,
	details: ReadonlyMap<string, ExerciseDetail>,
	options: RedrawOptions | undefined
): SessionItemView => {
	const exercise = catalog.exercises.find((candidate) => candidate.id === item.exercise);
	if (exercise === undefined) throw new Error(NO_EXERCISE + item.exercise);
	const detail = details.get(item.exercise);
	if (detail === undefined) throw new Error(NO_DETAIL + item.exercise);
	return {
		detail: detailViewOf(detail),
		dose: item.dose,
		drawNo: FIRST_DRAW,
		exercise: item.exercise,
		isExerciseRedrawable: options?.isExerciseRedrawable === true,
		isTargetRedrawable: options?.isTargetRedrawable === true,
		name: exercise.name,
		ord: item.ord,
		target: item.target
	};
};
