export interface Catalog {
	readonly exercises: readonly Exercise[];
	readonly muscleGroups: readonly MuscleGroup[];
	readonly targets: readonly Target[];
}

export interface Exercise {
	readonly catalogTarget: string;
	readonly dose: string;
	readonly id: string;
	readonly modality: string;
	readonly name: string;
	readonly slug: string;
}

export interface MuscleGroup {
	readonly id: string;
	readonly ord: number;
}

export interface Target {
	readonly id: string;
	readonly muscleGroup?: string;
	readonly slug: string;
}
