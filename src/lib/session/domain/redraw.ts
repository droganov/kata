import type { Assembly } from './assembly.ts';
import type { Catalog, Target } from './catalog.ts';
import type { NoveltyWeight } from './novelty.ts';
import type { Block, Program } from './program.ts';
import type { SessionItem } from './session.ts';

import { assemblyOf, groupTargets, targetItems, targetWeight } from './assembly.ts';
import { WITHOUT_HISTORY } from './novelty.ts';
import { sampled } from './random.ts';

const ONE_ITEM = 1;
const ANY_SEED = 0;

export const REDRAW_LEVEL = { exercise: 'exercise', target: 'target' } as const;

const REDRAW_LEVELS: ReadonlySet<unknown> = new Set(Object.values(REDRAW_LEVEL));

export interface Redraw {
	readonly items: readonly SessionItemRef[];
	readonly level: RedrawLevel;
	readonly ord: number;
	readonly rejected: Rejected;
}

export type RedrawLevel = (typeof REDRAW_LEVEL)[keyof typeof REDRAW_LEVEL];

export interface Rejected {
	readonly exercises: readonly string[];
	readonly targets: readonly string[];
}

export type SessionItemRef = Omit<SessionItem, 'dose'>;

export const isRedrawLevel = (value: unknown): value is RedrawLevel => REDRAW_LEVELS.has(value);

export const redrawnItem = (
	program: Program,
	catalog: Catalog,
	redraw: Redraw,
	seed: number,
	novelty: NoveltyWeight = WITHOUT_HISTORY
): SessionItem | undefined => {
	const item = redraw.items.find((candidate) => candidate.ord === redraw.ord);
	const block = program.blocks.find((candidate) => candidate.id === item?.block);
	if (item === undefined || block === undefined) return;
	const assembly = assemblyOf(program, catalog, seed, novelty, [
		...redraw.items.map((drawn) => drawn.exercise),
		...redraw.rejected.exercises
	]);
	const target =
		redraw.level === REDRAW_LEVEL.exercise
			? item.target
			: otherTargetOf(catalog, block, item, redraw, assembly);
	if (target === undefined) return;
	const [drawn] = targetItems(block, target, ONE_ITEM, assembly);
	return drawn && { ...drawn, ord: item.ord };
};

export const isTargetRedrawable = (
	program: Program,
	catalog: Catalog,
	blockId: string,
	target: string
): boolean => {
	const block = program.blocks.find((candidate) => candidate.id === blockId);
	if (block === undefined) return false;
	const assembly = assemblyOf(program, catalog, ANY_SEED, WITHOUT_HISTORY);
	return alternativesOf(catalog, block, target, assembly, [target]).length > 0;
};

const alternativesOf = (
	catalog: Catalog,
	block: Block,
	target: string,
	assembly: Assembly,
	excluded: readonly string[]
): readonly Target[] => {
	const group = catalog.targets.find((candidate) => candidate.id === target)?.muscleGroup;
	const isPinned = block.pinnedTargets.some((pin) => pin.id === target);
	if (group === undefined || isPinned) return [];
	return groupTargets(block, group, assembly).filter(
		(candidate) => !excluded.includes(candidate.id)
	);
};

const otherTargetOf = (
	catalog: Catalog,
	block: Block,
	item: SessionItemRef,
	redraw: Redraw,
	assembly: Assembly
): string | undefined => {
	const inBlock = redraw.items
		.filter((candidate) => candidate.block === block.id)
		.map((candidate) => candidate.target);
	const [target] = sampled(
		alternativesOf(catalog, block, item.target, assembly, [
			...inBlock,
			...redraw.rejected.targets
		]),
		ONE_ITEM,
		assembly.random,
		(candidate) => targetWeight(block, candidate.id, assembly)
	);
	return target?.id;
};
