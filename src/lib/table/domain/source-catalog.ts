export interface SourceCatalog {
	readonly equipment: readonly SourceEquipment[];
	readonly files: readonly SourceFile[];
	readonly references: readonly SourceReference[];
	readonly targets: readonly SourceTarget[];
	readonly verdicts: readonly SourceVerdict[];
}

export interface SourceEquipment {
	readonly canonEn: string;
	readonly id: string;
	readonly kind: string;
	readonly name: string;
	readonly slug: string;
}

export interface SourceExercise {
	readonly constraints: SourceConstraints;
	readonly dose: string;
	readonly equipment: readonly SourceLink[];
	readonly id: string;
	readonly modality: string;
	readonly name: string;
	readonly note?: string;
	readonly reference: string;
	readonly slug: string;
	readonly steps: readonly SourceStep[];
	readonly targets: readonly SourceLink[];
}

export interface SourceFile {
	readonly groups: readonly SourceGroup[];
	readonly slug: string;
}

export interface SourceLink {
	readonly id: string;
	readonly role: string;
}

export interface SourceOracle {
	readonly counterModel: readonly string[];
	readonly id: string;
	readonly model: readonly string[];
	readonly predicate: string;
}

export interface SourcePlacement {
	readonly catalogTarget: SourceCatalogTarget;
	readonly file: SourceFile;
	readonly group: SourceGroup;
}

export interface SourceRecord extends SourcePlacement {
	readonly exercise: SourceExercise;
}

export interface SourceReference {
	readonly id: string;
	readonly note?: string;
	readonly title: string;
	readonly url?: string;
}

export interface SourceStep {
	readonly active: readonly string[];
	readonly id: string;
	readonly oracles: readonly SourceOracle[];
	readonly title: string;
}

export interface SourceStepRecord {
	readonly at: number;
	readonly exercise: SourceExercise;
	readonly step: SourceStep;
}

export interface SourceTarget {
	readonly group: string;
	readonly id: string;
	readonly kind: string;
	readonly latin: string;
	readonly name: string;
	readonly slug: string;
}

export interface SourceVerdict {
	readonly hash: string;
	readonly line: string;
	readonly oracle: string;
	readonly reason?: string;
	readonly verdict: string;
}

interface SourceCatalogTarget {
	readonly exercises: readonly SourceExercise[];
	readonly id: string;
	readonly name: string;
	readonly slug: string;
}

interface SourceConstraints {
	readonly axial: boolean;
	readonly freeWeight: boolean;
	readonly kgMax?: number;
	readonly lumbarExt: boolean;
	readonly lumbarFlex: boolean;
}

interface SourceGroup {
	readonly id: string;
	readonly name: string;
	readonly slug: string;
	readonly targets: readonly SourceCatalogTarget[];
}

export const sourceOracles = (catalog: SourceCatalog): readonly SourceOracle[] =>
	sourceSteps(catalog).flatMap(({ step }) => step.oracles);

export const sourcePlacements = (catalog: SourceCatalog): readonly SourcePlacement[] => {
	const placements: SourcePlacement[] = [];
	for (const file of catalog.files)
		for (const group of file.groups)
			for (const catalogTarget of group.targets)
				placements.push({ catalogTarget, file, group });
	return placements;
};

export const sourceRecords = (catalog: SourceCatalog): readonly SourceRecord[] =>
	sourcePlacements(catalog).flatMap((placement) =>
		placement.catalogTarget.exercises.map((exercise) => ({ ...placement, exercise }))
	);

export const sourceSteps = (catalog: SourceCatalog): readonly SourceStepRecord[] =>
	sourceRecords(catalog).flatMap(({ exercise }) =>
		exercise.steps.map((step, at) => ({ at, exercise, step }))
	);
