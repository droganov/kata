const DRAW_LEVEL = { muscle_group: 'muscle_group', target: 'target' } as const;

export interface SourceBlock {
	readonly draw?: SourceDraw;
	readonly modality: string;
	readonly name: string;
	readonly pinnedGroups: readonly SourcePin[];
	readonly pinnedTargets: readonly SourcePin[];
}

export interface SourceProgramBlocks {
	readonly blocks: readonly SourceBlock[];
	readonly slug: string;
	readonly title: string;
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
		blocks: [
			{ modality: 'cardio', name: 'Разогрев', pinnedGroups: [], pinnedTargets: [] },
			{
				modality: 'dynamic',
				name: 'Разминка',
				pinnedGroups: [],
				pinnedTargets: [
					{ pick: 4, slug: 'cervical_spine' },
					{ pick: 1, slug: 'glenohumeral' },
					{ pick: 1, slug: 'scapulothoracic' },
					{ pick: 1, slug: 'elbow' },
					{ pick: 1, slug: 'wrist' },
					{ pick: 1, slug: 'fingers' },
					{ pick: 1, slug: 'thoracic_spine' },
					{ pick: 1, slug: 'lumbopelvic' },
					{ pick: 1, slug: 'hip' },
					{ pick: 1, slug: 'knee' },
					{ pick: 1, slug: 'ankle' }
				]
			},
			{
				draw: TWO_GROUPS_ONE_EACH,
				modality: 'loaded',
				name: 'Силовой',
				pinnedGroups: [
					{ pick: 1, slug: 'glutes' },
					{ pick: 1, slug: 'chest' }
				],
				pinnedTargets: []
			},
			{
				draw: TWO_GROUPS_ONE_EACH,
				modality: 'isometric',
				name: 'Изометрия',
				pinnedGroups: [
					{ pick: 1, slug: 'back' },
					{ pick: 1, slug: 'core' }
				],
				pinnedTargets: []
			},
			{
				draw: TWO_GROUPS_ONE_EACH,
				modality: 'static_stretch',
				name: 'Растяжка',
				pinnedGroups: [
					{ pick: 1, slug: 'back' },
					{ pick: 1, slug: 'glutes' }
				],
				pinnedTargets: []
			}
		],
		slug: 'pins_and_draw',
		title: 'Закрепления и добор'
	}
};
