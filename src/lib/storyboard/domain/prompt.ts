import type { StepKind } from './step-kind.ts';

export interface Frame {
	readonly activeMuscles: readonly string[];
	readonly camera: string;
	readonly carry?: FrameCarry;
	readonly number: number;
	readonly oracles: readonly FrameOracle[];
	readonly title: string;
	readonly workingSide?: string;
}

export interface FrameOracle {
	readonly counterModel: readonly OracleLine[];
	readonly model: readonly OracleLine[];
	readonly predicate: OracleLine;
}

export interface OracleLine {
	readonly id: string;
	readonly isMarked: boolean;
	readonly text: string;
}

export interface Prompt {
	readonly exercise: string;
	readonly frames: readonly Frame[];
	readonly text: string;
}

export interface PromptCatalog {
	readonly equipment: ReadonlyMap<string, PromptEquipment>;
	readonly targets: ReadonlyMap<string, PromptTarget>;
}

export interface PromptExercise {
	readonly dose: string;
	readonly equipment: readonly PromptRef[];
	readonly id: string;
	readonly name: string;
	readonly procedure: PromptProcedure;
	readonly targets: readonly PromptRef[];
}

export interface PromptLine {
	readonly isData: boolean;
	readonly text: string;
}

export interface PromptOracle {
	readonly counterModel: readonly string[];
	readonly model: readonly string[];
	readonly predicate: string;
}

export interface PromptStep {
	readonly active: readonly string[];
	readonly oracles: readonly PromptOracle[];
	readonly title: string;
}

interface FrameCarry {
	readonly kind: StepKind;
	readonly source: number;
}

interface PromptEquipment {
	readonly canonEn: string;
}

interface PromptProcedure {
	readonly steps: readonly PromptStep[];
}

interface PromptRef {
	readonly id: string;
	readonly role: string;
}

interface PromptTarget {
	readonly latin: string;
}
