import type { Catalog, Exercise } from '../domain/catalog.ts';
import type { DetailEntry, ExerciseDetail } from '../domain/exercise-detail.ts';
import type { Program } from '../domain/program.ts';
import type { Session, SessionItem } from '../domain/session.ts';

import { blocksInOrder } from '../domain/program.ts';

const NO_EXERCISE = 'Упражнения нет в каталоге: ';
const NO_DETAIL = 'У Упражнения нет процедуры в таблицах: ';
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

interface SessionItemView {
	readonly detail: ExerciseDetailView;
	readonly dose: string;
	readonly exercise: string;
	readonly name: string;
	readonly ord: number;
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
	const exercises = new Map(catalog.exercises.map((exercise) => [exercise.id, exercise]));
	return {
		blocks: blocksInOrder(program).map((block) => ({
			id: block.id,
			items: session.items
				.filter((item) => item.block === block.id)
				.map((item) => itemViewOf(item, exercises, details)),
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

const itemViewOf = (
	item: SessionItem,
	exercises: ReadonlyMap<string, Exercise>,
	details: ReadonlyMap<string, ExerciseDetail>
): SessionItemView => {
	const exercise = exercises.get(item.exercise);
	if (exercise === undefined) throw new Error(NO_EXERCISE + item.exercise);
	const detail = details.get(item.exercise);
	if (detail === undefined) throw new Error(NO_DETAIL + item.exercise);
	return {
		detail: detailViewOf(detail),
		dose: item.dose,
		exercise: item.exercise,
		name: exercise.name,
		ord: item.ord
	};
};
