import type { Uuid } from '../../shared/uuid.ts';

export const BANK_SLUG = {
	calisthenics: 'calisthenics',
	cardio: 'cardio',
	strength: 'strength',
	stretch: 'stretch',
	warmup: 'warmup'
} as const;

export const EQUIPMENT_ROLE = { auxiliary: 'auxiliary', main: 'main' } as const;

export const EXERCISE_MODE = {
	calisthenic: 'calisthenic',
	cardio: 'cardio',
	dynamic: 'dynamic',
	isometric: 'isometric',
	loaded: 'loaded',
	static_stretch: 'static_stretch'
} as const;

export const TARGET_ROLE = {
	primary: 'primary',
	secondary: 'secondary',
	stabilizer: 'stabilizer'
} as const;

export interface Bank {
	readonly excluded?: readonly ExcludedExercise[];
	readonly id: Uuid;
	readonly rules: readonly string[];
	readonly session_budget_sec?: number;
	readonly slug: BankSlug;
	readonly title: string;
	readonly zones: readonly Zone[];
}

export interface BankExercise {
	readonly constraints: ExerciseConstraints;
	readonly dose: string;
	readonly equipment: readonly EquipmentRef[];
	readonly goal?: ExerciseGoal;
	readonly hip_plane?: HipPlane;
	readonly id: Uuid;
	readonly mode: ExerciseMode;
	readonly name: string;
	readonly note?: string;
	readonly plane?: CorePlane;
	readonly seconds?: number;
	readonly slug: string;
	readonly targets: readonly TargetRef[];
}

export interface BankRecord {
	readonly contour: Contour;
	readonly exercise: BankExercise;
	readonly zone: Zone;
}

export type BankSlug = (typeof BANK_SLUG)[keyof typeof BANK_SLUG];

export interface Contour {
	readonly exercises: readonly BankExercise[];
	readonly id: Uuid;
	readonly pick?: number;
	readonly slug: string;
	readonly title: string;
}

export interface EquipmentRef {
	readonly id: Uuid;
	readonly role: EquipmentRole;
}

export interface ExerciseConstraints {
	readonly axial: boolean;
	readonly free_weight: boolean;
	readonly kg_max?: number;
	readonly lumbar_ext: boolean;
	readonly lumbar_flex: boolean;
}

export type ExerciseMode = (typeof EXERCISE_MODE)[keyof typeof EXERCISE_MODE];

export interface Zone {
	readonly contours: readonly Contour[];
	readonly id: Uuid;
	readonly rule?: string;
	readonly slug: string;
	readonly title: string;
}

type CorePlane =
	'anterior' | 'anti_extension' | 'anti_rotation' | 'balance' | 'lateral' | 'posterior';

type EquipmentRole = (typeof EQUIPMENT_ROLE)[keyof typeof EQUIPMENT_ROLE];

interface ExcludedExercise {
	readonly name: string;
	readonly reason: string;
}

type ExerciseGoal =
	| 'body_composition'
	| 'endurance'
	| 'flexibility'
	| 'glutes'
	| 'hip_mobility'
	| 'lumbar_stiffness'
	| 'strength';

type HipPlane =
	'abduction' | 'adduction' | 'extension' | 'external_rot' | 'flexion' | 'internal_rot';

interface TargetRef {
	readonly id: Uuid;
	readonly role: TargetRole;
}

type TargetRole = (typeof TARGET_ROLE)[keyof typeof TARGET_ROLE];

export const bankRecords = (bank: Bank): BankRecord[] =>
	bank.zones.flatMap((zone) =>
		zone.contours.flatMap((contour) =>
			contour.exercises.map((exercise) => ({ contour, exercise, zone }))
		)
	);

export const contoursOf = (bank: Bank): { contour: Contour; zone: Zone }[] =>
	bank.zones.flatMap((zone) => zone.contours.map((contour) => ({ contour, zone })));

export const mainEquipmentRefsOf = (exercise: BankExercise): EquipmentRef[] =>
	exercise.equipment.filter((reference) => reference.role === EQUIPMENT_ROLE.main);
