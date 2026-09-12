import type { Catalog, Exercise, MuscleGroup, Target } from './catalog.ts';
import type { Block, BlockPin, Program } from './program.ts';
import type { Session, SessionItem } from './session.ts';

import { blocksInOrder, byOrd, DRAW_LEVEL } from './program.ts';

const FIRST_ORD = 1;

interface BlockCatalog {
	readonly exercises: readonly Exercise[];
	readonly targets: readonly Target[];
}

type BlockItem = Omit<SessionItem, 'ord'>;

interface TargetPick {
	readonly count: number;
	readonly target: string;
}

export const sessionOf = (program: Program, catalog: Catalog): Session => ({
	items: blocksInOrder(program)
		.flatMap((block) => blockItems(block, catalog))
		.map((draft, at) => ({ ...draft, ord: at + FIRST_ORD })),
	program: program.id
});

const blockItems = (block: Block, catalog: Catalog): readonly BlockItem[] => {
	const blockCatalog = blockCatalogOf(block, catalog);
	return targetPicks(block, blockCatalog, catalog.muscleGroups).flatMap((pick) =>
		blockCatalog.exercises
			.filter((exercise) => exercise.catalogTarget === pick.target)
			.slice(0, pick.count)
			.map((exercise) => ({
				block: block.id,
				dose: exercise.dose,
				exercise: exercise.id,
				target: pick.target
			}))
	);
};

const bySlug = (first: { readonly slug: string }, second: { readonly slug: string }): number =>
	first.slug.localeCompare(second.slug);

const drawnPicks = (
	block: Block,
	blockCatalog: BlockCatalog,
	groups: readonly MuscleGroup[]
): readonly TargetPick[] => {
	const { draw } = block;
	if (draw === undefined) return [];
	const pinnedGroups = new Set<string | undefined>(block.pinnedGroups.map((pin) => pin.id));
	if (draw.level === DRAW_LEVEL.muscle_group)
		return groups
			.filter((group) => !pinnedGroups.has(group.id))
			.toSorted(byOrd)
			.flatMap((group) => groupTargetPicks(group.id, draw.pickEach, blockCatalog))
			.slice(0, draw.count);
	const pinnedTargets = new Set(block.pinnedTargets.map((pin) => pin.id));
	return blockCatalog.targets
		.filter((target) => !pinnedTargets.has(target.id) && !pinnedGroups.has(target.muscleGroup))
		.slice(0, draw.count)
		.map((target) => ({ count: draw.pickEach, target: target.id }));
};

const groupTargetPicks = (
	group: string,
	count: number,
	blockCatalog: BlockCatalog
): readonly TargetPick[] =>
	blockCatalog.targets
		.filter((target) => target.muscleGroup === group)
		.slice(0, 1)
		.map((target) => ({ count, target: target.id }));

const pinPicks = (pins: readonly BlockPin[]): readonly TargetPick[] =>
	pins.toSorted(byOrd).map((pin) => ({ count: pin.pick, target: pin.id }));

const blockCatalogOf = (block: Block, catalog: Catalog): BlockCatalog => {
	const exercises = catalog.exercises
		.filter((exercise) => exercise.modality === block.modality)
		.toSorted(bySlug);
	const stocked = new Set(exercises.map((exercise) => exercise.catalogTarget));
	return {
		exercises,
		targets: catalog.targets.filter((target) => stocked.has(target.id)).toSorted(bySlug)
	};
};

const targetPicks = (
	block: Block,
	blockCatalog: BlockCatalog,
	groups: readonly MuscleGroup[]
): readonly TargetPick[] => [
	...pinPicks(block.pinnedTargets),
	...block.pinnedGroups
		.toSorted(byOrd)
		.flatMap((pin) => groupTargetPicks(pin.id, pin.pick, blockCatalog)),
	...drawnPicks(block, blockCatalog, groups)
];
