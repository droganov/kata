export interface SourceCatalog {
	readonly equipment: readonly SourceEquipment[];
	readonly files: readonly SourceFile[];
	readonly references: readonly SourceReference[];
	readonly targets: readonly SourceTarget[];
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

export interface SourceTarget {
	readonly group: string;
	readonly id: string;
	readonly kind: string;
	readonly latin: string;
	readonly name: string;
	readonly slug: string;
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

export function sourcePlacements(catalog: SourceCatalog): readonly SourcePlacement[] {
	const placements: SourcePlacement[] = [];
	for (const file of catalog.files)
		for (const group of file.groups)
			for (const catalogTarget of group.targets)
				placements.push({ catalogTarget, file, group });
	return placements;
}

export function sourceRecords(catalog: SourceCatalog): readonly SourceRecord[] {
	return sourcePlacements(catalog).flatMap((placement) =>
		placement.catalogTarget.exercises.map((exercise) => ({ ...placement, exercise }))
	);
}
