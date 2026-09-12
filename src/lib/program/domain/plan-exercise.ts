import type { CorePlane, HipPlane, SectionMode } from './program.ts';

const SECONDARY_WEIGHT = 0.5;
const STABILIZER_WEIGHT = 0;
const PRIMARY_WEIGHT = 1;

const TARGET_ROLE = {
	primary: 'primary',
	secondary: 'secondary',
	stabilizer: 'stabilizer'
} as const;

const ROLE_WEIGHT: Readonly<Record<TargetRole, number>> = {
	primary: PRIMARY_WEIGHT,
	secondary: SECONDARY_WEIGHT,
	stabilizer: STABILIZER_WEIGHT
};

export interface PlanConstraints {
	readonly axial: boolean;
	readonly free_weight: boolean;
	readonly kg_max?: number;
	readonly lumbar_ext: boolean;
	readonly lumbar_flex: boolean;
}

export interface PlanExercise {
	readonly constraints: PlanConstraints;
	readonly dose: string;
	readonly goal?: string;
	readonly hasProcedure: boolean;
	readonly hipPlane?: HipPlane;
	readonly id: string;
	readonly mode: SectionMode;
	readonly name: string;
	readonly plane?: CorePlane;
	readonly seconds?: number;
	readonly slug: string;
	readonly targets: readonly PlanTarget[];
}

export type PlanExercises = ReadonlyMap<string, PlanExercise>;

export interface PlanTarget {
	readonly group: string;
	readonly role: TargetRole;
}

type TargetRole = (typeof TARGET_ROLE)[keyof typeof TARGET_ROLE];

export const groupWeightsOf = (exercise: PlanExercise): ReadonlyMap<string, number> => {
	const weights = new Map<string, number>();
	for (const target of exercise.targets) {
		const weight = ROLE_WEIGHT[target.role];
		weights.set(target.group, Math.max(weights.get(target.group) ?? STABILIZER_WEIGHT, weight));
	}
	return weights;
};

export const hasPrimaryGroup = (exercise: PlanExercise, group: string): boolean =>
	exercise.targets.some(
		(target) => target.group === group && target.role === TARGET_ROLE.primary
	);

export const planExercisesOf = (
	ids: readonly string[],
	exercises: PlanExercises
): readonly PlanExercise[] =>
	ids.flatMap((id) => {
		const found = exercises.get(id);
		return found === undefined ? [] : [found];
	});
