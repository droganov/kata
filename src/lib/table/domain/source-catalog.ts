export interface SourceCatalog {
	readonly documents: readonly SourceDocument[];
	readonly equipment: readonly SourceEquipment[];
	readonly files: readonly SourceFile[];
	readonly persons: readonly SourcePerson[];
	readonly programs: readonly SourceProgram[];
	readonly references: readonly SourceReference[];
	readonly targets: readonly SourceTarget[];
	readonly verdicts: readonly SourceVerdict[];
}

export interface SourceDocument {
	readonly kind: string;
	readonly name: string;
	readonly value: unknown;
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
	readonly corePlane?: string;
	readonly dose: string;
	readonly equipment: readonly SourceLink[];
	readonly goal?: string;
	readonly hipPlane?: string;
	readonly id: string;
	readonly met?: number;
	readonly modality: string;
	readonly name: string;
	readonly note?: string;
	readonly procedureId: string;
	readonly reference: string;
	readonly seconds?: number;
	readonly slug: string;
	readonly steps: readonly SourceStep[];
	readonly targets: readonly SourceLink[];
}

export interface SourceFile {
	readonly excluded: readonly SourceExcluded[];
	readonly groups: readonly SourceGroup[];
	readonly id: string;
	readonly rules: readonly string[];
	readonly sessionBudgetSec?: number;
	readonly slug: string;
	readonly title: string;
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

export interface SourceOutsideGym {
	readonly intensity?: string;
	readonly key: string;
	readonly minutes: number;
	readonly name: string;
	readonly perWeek: number;
}

export interface SourcePerson {
	readonly id: string;
	readonly name: string;
	readonly programs: readonly string[];
}

export interface SourcePlacement {
	readonly catalogTarget: SourceCatalogTarget;
	readonly file: SourceFile;
	readonly group: SourceGroup;
}

export interface SourceProgram {
	readonly contraindications: SourceContraindications;
	readonly goals: SourceGoals;
	readonly hipPlanes: readonly string[];
	readonly id: string;
	readonly outsideGym: readonly SourceOutsideGym[];
	readonly pairings: readonly SourcePairing[];
	readonly person: string;
	readonly progression: SourceProgression;
	readonly rotationWeeks: number;
	readonly sections: readonly SourceSection[];
	readonly sessionBudgetMin: number;
	readonly sessionsPerWeek: number;
	readonly timing: SourceTiming;
	readonly title: string;
	readonly volumes: readonly SourceVolume[];
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

export interface SourceSection {
	readonly bank: string;
	readonly id: string;
	readonly mode: string;
	readonly slots: readonly SourceSlot[];
	readonly slug: string;
	readonly title: string;
}

export interface SourceSlot {
	readonly allowRepeat?: boolean;
	readonly exercises: readonly string[];
	readonly id: string;
	readonly kind: string;
	readonly label: string;
	readonly pick?: number;
	readonly rule?: string;
	readonly secEach?: number;
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
	readonly targetGroup?: string;
}

export interface SourceVerdict {
	readonly hash: string;
	readonly id: string;
	readonly line: string;
	readonly oracle: string;
	readonly reason?: string;
	readonly verdict: string;
}

interface SourceCatalogTarget {
	readonly exercises: readonly SourceExercise[];
	readonly id: string;
	readonly name: string;
	readonly pick?: number;
	readonly slug: string;
}

interface SourceConstraints {
	readonly axial: boolean;
	readonly freeWeight: boolean;
	readonly kgMax?: number;
	readonly lumbarExt: boolean;
	readonly lumbarFlex: boolean;
}

interface SourceContraindications {
	readonly axialLoad: boolean;
	readonly freeWeightKgMax: number;
	readonly lumbarExtension: boolean;
	readonly lumbarFlexion: boolean;
}

interface SourceExcluded {
	readonly name: string;
	readonly reason: string;
}

interface SourceGoals {
	readonly primary: readonly string[];
	readonly secondary: readonly string[];
}

interface SourceGroup {
	readonly id: string;
	readonly name: string;
	readonly rule?: string;
	readonly slug: string;
	readonly targets: readonly SourceCatalogTarget[];
}

interface SourcePairing {
	readonly exercises: readonly string[];
	readonly slot: string;
}

interface SourceProgression {
	readonly drawn: string;
	readonly isometric: string;
	readonly pinned: string;
	readonly stopRule: string;
}

interface SourceTiming {
	readonly holdRestSec: number;
	readonly restSecAccessory: number;
	readonly restSecStrength: number;
	readonly transitionSec: number;
	readonly warmupGeneralMin?: number;
	readonly workSecPerSet: number;
}

interface SourceVolume {
	readonly group: string;
	readonly max: number;
	readonly min: number;
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
