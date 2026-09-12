import type { Uuid } from '../../shared/uuid.ts';

const MAIN_EQUIPMENT_ROLE = 'main';
const SUBJECT_SEPARATOR = ':';

export type CorePlane =
	'anterior' | 'anti_extension' | 'anti_rotation' | 'balance' | 'lateral' | 'posterior';

export interface EquipmentRef {
	readonly id: Uuid;
	readonly role: EquipmentRole;
}

export interface Exercise {
	readonly constraints: ExerciseConstraints;
	readonly dose: string;
	readonly equipment: readonly EquipmentRef[];
	readonly goal?: ExerciseGoal;
	readonly hip_plane?: HipPlane;
	readonly id: Uuid;
	readonly met?: number;
	readonly mode: ExerciseMode;
	readonly name: string;
	readonly note?: string;
	readonly plane?: CorePlane;
	readonly procedure: Procedure;
	readonly seconds?: number;
	readonly slug: string;
	readonly source: Uuid;
	readonly targets: readonly TargetRef[];
}

export interface ExerciseConstraints {
	readonly axial: boolean;
	readonly free_weight: boolean;
	readonly kg_max?: number;
	readonly lumbar_ext: boolean;
	readonly lumbar_flex: boolean;
}

export type ExerciseGoal =
	| 'body_composition'
	| 'endurance'
	| 'flexibility'
	| 'glutes'
	| 'hip_mobility'
	| 'lumbar_stiffness'
	| 'strength';

export type ExerciseMode =
	'calisthenic' | 'cardio' | 'dynamic' | 'isometric' | 'loaded' | 'static_stretch';

export interface ExerciseRecord {
	readonly bank: string;
	readonly contourSlug: string;
	readonly contourTitle: string;
	readonly exercise: Exercise;
}

export type HipPlane =
	'abduction' | 'adduction' | 'extension' | 'external_rot' | 'flexion' | 'internal_rot';

export interface Oracle {
	readonly counterModel: readonly string[];
	readonly id: Uuid;
	readonly model: readonly string[];
	readonly predicate: string;
}

export interface Procedure {
	readonly id: Uuid;
	readonly steps: readonly Step[];
}

export interface Step {
	readonly active: readonly Uuid[];
	readonly id: Uuid;
	readonly oracles: readonly Oracle[];
	readonly title: string;
}

export interface TargetRef {
	readonly id: Uuid;
	readonly role: TargetRole;
}

type EquipmentRole = 'auxiliary' | 'main';

type TargetRole = 'primary' | 'secondary' | 'stabilizer';

export const counterLinesOf = (step: Step): readonly string[] =>
	step.oracles.flatMap((oracle) => oracle.counterModel);

export const exerciseSubject = (record: ExerciseRecord): string =>
	`${record.bank}${SUBJECT_SEPARATOR}${record.exercise.slug}`;

export const mainEquipmentIdsOf = (exercise: Exercise): readonly Uuid[] =>
	exercise.equipment
		.filter((reference) => reference.role === MAIN_EQUIPMENT_ROLE)
		.map((reference) => reference.id);

export const stepModelOf = (step: Step): readonly string[] => [
	...stepPredicatesOf(step),
	...step.oracles.flatMap((oracle) => oracle.model)
];

export const stepPredicatesOf = (step: Step): readonly string[] =>
	step.oracles.map((oracle) => oracle.predicate);

export const targetIdsOf = (exercise: Exercise): ReadonlySet<string> =>
	new Set(exercise.targets.map((reference) => reference.id));
