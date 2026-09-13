export const DRAW_LEVEL = { muscle_group: 'muscle_group', target: 'target' } as const;

const DRAW_LEVELS: ReadonlySet<string> = new Set(Object.values(DRAW_LEVEL));

export interface Block {
	readonly draw?: BlockDraw;
	readonly id: string;
	readonly modality: string;
	readonly name: string;
	readonly ord: number;
	readonly pairs: readonly BlockPair[];
	readonly pinnedGroups: readonly BlockPin[];
	readonly pinnedTargets: readonly BlockPin[];
}

export interface BlockDraw {
	readonly count: number;
	readonly level: DrawLevel;
	readonly pickEach: number;
}

export interface BlockPair {
	readonly thenTarget: string;
	readonly whenGroup: string;
}

export interface BlockPin {
	readonly id: string;
	readonly ord: number;
	readonly pick: number;
}

export interface Contraindications {
	readonly freeWeightKgMax?: number;
	readonly noAxialLoad: boolean;
	readonly noLumbarExtension: boolean;
	readonly noLumbarFlexion: boolean;
}

export type DrawLevel = (typeof DRAW_LEVEL)[keyof typeof DRAW_LEVEL];

export interface Program {
	readonly blocks: readonly Block[];
	readonly contraindications: Contraindications;
	readonly id: string;
	readonly title: string;
}

export const byOrd = (first: { readonly ord: number }, second: { readonly ord: number }): number =>
	first.ord - second.ord;

export const blocksInOrder = (program: Program): readonly Block[] => program.blocks.toSorted(byOrd);

export const isDrawLevel = (value: string): value is DrawLevel => DRAW_LEVELS.has(value);
