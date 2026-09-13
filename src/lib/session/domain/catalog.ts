export interface Catalog {
	readonly exercises: readonly Exercise[];
	readonly muscleGroups: readonly MuscleGroup[];
	readonly targets: readonly Target[];
}

export interface Exercise {
	readonly axial: boolean;
	readonly catalogTarget: string;
	readonly dose: string;
	readonly freeWeight: boolean;
	readonly id: string;
	readonly kgMax?: number;
	readonly lumbarExt: boolean;
	readonly lumbarFlex: boolean;
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
