import type { Catalog, Exercise, MuscleGroup, Target } from './catalog.ts';
import type { Block, Contraindications, Program } from './program.ts';
import type { Random } from './random.ts';
import type { Session, SessionItem } from './session.ts';

import { blocksInOrder, byOrd, DRAW_LEVEL } from './program.ts';
import { randomOf, sampled } from './random.ts';

const FIRST_ORD = 1;
const TARGETS_PER_GROUP = 1;
const PAIR_ROWS_PER_GROUP = 1;
const PAIR_PICK = 1;
const LOADED_MODALITY = 'loaded';

interface Assembly {
	readonly exercises: readonly Exercise[];
	readonly groups: readonly MuscleGroup[];
	readonly loadedGroups: Set<string>;
	readonly random: Random;
	readonly taken: Set<string>;
	readonly targets: readonly Target[];
}

type BlockItem = Omit<SessionItem, 'ord'>;

export const sessionOf = (program: Program, catalog: Catalog, seed: number): Session => {
	const assembly = assemblyOf(program, catalog, seed);
	return {
		items: blocksInOrder(program)
			.flatMap((block) => blockItems(block, assembly))
			.map((item, at) => ({ ...item, ord: at + FIRST_ORD })),
		program: program.id,
		seed
	};
};

const assemblyOf = (program: Program, catalog: Catalog, seed: number): Assembly => ({
	exercises: catalog.exercises.filter((exercise) =>
		isPermitted(exercise, program.contraindications)
	),
	groups: catalog.muscleGroups.toSorted(byOrd),
	loadedGroups: new Set(),
	random: randomOf(seed),
	taken: new Set(),
	targets: catalog.targets
});

const availableOf = (block: Block, target: string, assembly: Assembly): readonly Exercise[] =>
	assembly.exercises.filter(
		(exercise) =>
			exercise.modality === block.modality &&
			exercise.catalogTarget === target &&
			!assembly.taken.has(exercise.id)
	);

const blockItems = (block: Block, assembly: Assembly): readonly BlockItem[] => {
	const items = [
		...block.pinnedTargets
			.toSorted(byOrd)
			.flatMap((pin) => targetItems(block, pin.id, pin.pick, assembly)),
		...block.pinnedGroups
			.toSorted(byOrd)
			.flatMap((pin) => groupItems(block, pin.id, pin.pick, assembly)),
		...drawnItems(block, assembly),
		...pairedItems(block, assembly)
	];
	if (block.modality === LOADED_MODALITY) markLoaded(items, assembly);
	return items;
};

const drawnItems = (block: Block, assembly: Assembly): readonly BlockItem[] => {
	const { draw } = block;
	if (draw === undefined) return [];
	const pinnedTargets = new Set(block.pinnedTargets.map((pin) => pin.id));
	const pinnedGroups = new Set<string | undefined>(block.pinnedGroups.map((pin) => pin.id));
	if (draw.level === DRAW_LEVEL.muscle_group) {
		const groupsOfPinnedTargets = new Set(
			assembly.targets
				.filter((target) => pinnedTargets.has(target.id))
				.map((target) => target.muscleGroup)
		);
		return sampled(
			assembly.groups.filter(
				(group) =>
					!pinnedGroups.has(group.id) &&
					!groupsOfPinnedTargets.has(group.id) &&
					groupTargets(block, group.id, assembly).length > 0
			),
			draw.count,
			assembly.random
		).flatMap((group) => groupItems(block, group.id, draw.pickEach, assembly));
	}
	return sampled(
		assembly.targets.filter(
			(target) =>
				!pinnedTargets.has(target.id) &&
				!pinnedGroups.has(target.muscleGroup) &&
				isStocked(block, target.id, assembly)
		),
		draw.count,
		assembly.random
	).flatMap((target) => targetItems(block, target.id, draw.pickEach, assembly));
};

const groupItems = (
	block: Block,
	group: string,
	count: number,
	assembly: Assembly
): readonly BlockItem[] =>
	sampled(groupTargets(block, group, assembly), TARGETS_PER_GROUP, assembly.random).flatMap(
		(target) => targetItems(block, target.id, count, assembly)
	);

const groupTargets = (block: Block, group: string, assembly: Assembly): readonly Target[] =>
	assembly.targets.filter(
		(target) => target.muscleGroup === group && isStocked(block, target.id, assembly)
	);

const isOverFreeWeight = (exercise: Exercise, freeWeightKgMax: number | undefined): boolean =>
	exercise.freeWeight &&
	freeWeightKgMax !== undefined &&
	(exercise.kgMax ?? Infinity) > freeWeightKgMax;

const isPermitted = (exercise: Exercise, limits: Contraindications): boolean =>
	!(limits.noAxialLoad && exercise.axial) &&
	!(limits.noLumbarFlexion && exercise.lumbarFlex) &&
	!(limits.noLumbarExtension && exercise.lumbarExt) &&
	!isOverFreeWeight(exercise, limits.freeWeightKgMax);

const isStocked = (block: Block, target: string, assembly: Assembly): boolean =>
	availableOf(block, target, assembly).length > 0;

const markLoaded = (items: readonly BlockItem[], assembly: Assembly): void => {
	const loadedTargets = new Set(items.map((item) => item.target));
	for (const target of assembly.targets)
		if (target.muscleGroup !== undefined && loadedTargets.has(target.id))
			assembly.loadedGroups.add(target.muscleGroup);
};

const pairedItems = (block: Block, assembly: Assembly): readonly BlockItem[] =>
	[...assembly.loadedGroups].flatMap((group) =>
		sampled(
			block.pairs.filter(
				(pair) => pair.whenGroup === group && isStocked(block, pair.thenTarget, assembly)
			),
			PAIR_ROWS_PER_GROUP,
			assembly.random
		).flatMap((pair) => targetItems(block, pair.thenTarget, PAIR_PICK, assembly))
	);

const targetItems = (
	block: Block,
	target: string,
	count: number,
	assembly: Assembly
): readonly BlockItem[] =>
	sampled(availableOf(block, target, assembly), count, assembly.random).map((exercise) => {
		assembly.taken.add(exercise.id);
		return { block: block.id, dose: exercise.dose, exercise: exercise.id, target };
	});
