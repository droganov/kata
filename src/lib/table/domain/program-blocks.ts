const DRAW_LEVEL = { muscle_group: 'muscle_group', target: 'target' } as const;

export interface SourceBlock {
	readonly draw?: SourceDraw;
	readonly name?: string;
	readonly pinnedGroups: readonly SourcePin[];
}

export interface SourceProgramBlocks {
	readonly blocks: Readonly<Record<string, SourceBlock>>;
	readonly slug: string;
}

type DrawLevel = (typeof DRAW_LEVEL)[keyof typeof DRAW_LEVEL];

interface SourceDraw {
	readonly count: number;
	readonly level: DrawLevel;
	readonly pickEach: number;
}

interface SourcePin {
	readonly pick: number;
	readonly slug: string;
}

const TWO_GROUPS_ONE_EACH: SourceDraw = { count: 2, level: DRAW_LEVEL.muscle_group, pickEach: 1 };

export const PROGRAM_BLOCKS: Readonly<Record<string, SourceProgramBlocks>> = {
	'01a0889d-8ae8-7c8a-b964-0ead5f668a5a': {
		blocks: {
			calisthenics: {
				draw: TWO_GROUPS_ONE_EACH,
				name: 'Изометрия',
				pinnedGroups: [
					{ pick: 1, slug: 'back' },
					{ pick: 1, slug: 'core' }
				]
			},
			strength: {
				draw: TWO_GROUPS_ONE_EACH,
				pinnedGroups: [
					{ pick: 1, slug: 'glutes' },
					{ pick: 1, slug: 'chest' }
				]
			},
			stretch: {
				draw: TWO_GROUPS_ONE_EACH,
				pinnedGroups: [
					{ pick: 1, slug: 'back' },
					{ pick: 1, slug: 'glutes' }
				]
			}
		},
		slug: 'pins_and_draw'
	}
};
