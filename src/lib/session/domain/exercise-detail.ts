export interface DetailEntry {
	readonly name: string;
	readonly role: string;
}

export interface DetailOracle {
	readonly counterModel: readonly string[];
	readonly id: string;
	readonly model: readonly string[];
	readonly predicate: string;
}

export interface DetailStep {
	readonly active: readonly string[];
	readonly id: string;
	readonly oracles: readonly DetailOracle[];
	readonly title: string;
}

export interface ExerciseDetail {
	readonly equipment: readonly DetailEntry[];
	readonly note?: string;
	readonly steps: readonly DetailStep[];
	readonly targets: readonly DetailEntry[];
}
