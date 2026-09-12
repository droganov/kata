import type {
	CorePlane,
	EquipmentRef,
	Exercise,
	ExerciseConstraints,
	ExerciseGoal,
	ExerciseMode,
	HipPlane,
	Procedure,
	TargetRef
} from '../domain/exercise.ts';

export interface ExerciseView {
	readonly constraints: ExerciseConstraints;
	readonly dose: string;
	readonly equipment: readonly EquipmentRef[];
	readonly goal?: ExerciseGoal;
	readonly hipPlane?: HipPlane;
	readonly id: string;
	readonly mode: ExerciseMode;
	readonly name: string;
	readonly note?: string;
	readonly plane?: CorePlane;
	readonly procedure: Procedure;
	readonly seconds?: number;
	readonly slug: string;
	readonly targets: readonly TargetRef[];
}

export const exerciseViewOf = (exercise: Exercise): ExerciseView => ({
	constraints: exercise.constraints,
	dose: exercise.dose,
	equipment: exercise.equipment,
	...(exercise.goal !== undefined && { goal: exercise.goal }),
	...(exercise.hip_plane !== undefined && { hipPlane: exercise.hip_plane }),
	id: exercise.id,
	mode: exercise.mode,
	name: exercise.name,
	...(exercise.note !== undefined && { note: exercise.note }),
	...(exercise.plane !== undefined && { plane: exercise.plane }),
	procedure: exercise.procedure,
	...(exercise.seconds !== undefined && { seconds: exercise.seconds }),
	slug: exercise.slug,
	targets: exercise.targets
});
