import type { BlockTables } from './block.ts';
import type { CatalogIds } from './catalog-ids.ts';
import type { SourceProgramBlocks } from './program-blocks.ts';
import type { SourceCatalog, SourceProgram } from './source-catalog.ts';
import type { Row } from './table.ts';

import { blockTablesOf } from './block.ts';
import { idOf } from './catalog-ids.ts';

const FIRST_ORD = 1;
const SECONDS_IN_MINUTE = 60;
const NO_BLOCKS = 'Блоки программы не объявлены: ';
const NO_GOAL = 'цель не найдена: ';
const NO_TARGET_GROUP = 'анатомическая группа не найдена: ';

const PRIORITY = { primary: 'primary', secondary: 'secondary' } as const;

const TIMING_KEY = {
	hold_rest: 'hold_rest',
	rest_accessory: 'rest_accessory',
	rest_strength: 'rest_strength',
	transition: 'transition',
	warmup_general: 'warmup_general',
	work_per_set: 'work_per_set'
} as const;

const PROGRESSION_KEY = {
	drawn: 'drawn',
	isometric: 'isometric',
	pinned: 'pinned',
	stop_rule: 'stop_rule'
} as const;

export interface ProgramTables extends BlockTables {
	readonly program: readonly Row[];
	readonly program_goal: readonly Row[];
	readonly program_hip_plane: readonly Row[];
	readonly program_outside_gym: readonly Row[];
	readonly program_progression: readonly Row[];
	readonly program_timing: readonly Row[];
	readonly program_volume: readonly Row[];
}

export const programTablesOf = (
	catalog: SourceCatalog,
	declared: Readonly<Record<string, SourceProgramBlocks>>,
	ids: CatalogIds
): ProgramTables => {
	const tables = catalog.programs.map((program): ProgramTables => {
		const blocks = blocksOf(declared, program.id);
		return {
			...blockTablesOf(catalog, program, blocks, ids),
			program: [programRow(program, blocks)],
			program_goal: goalRows(program, ids),
			program_hip_plane: hipPlaneRows(program),
			program_outside_gym: outsideGymRows(program),
			program_progression: progressionRows(program),
			program_timing: timingRows(program),
			program_volume: volumeRows(program, ids)
		};
	});
	return {
		block: tables.flatMap((table) => table.block),
		block_draw: tables.flatMap((table) => table.block_draw),
		block_excluded: tables.flatMap((table) => table.block_excluded),
		block_pair: tables.flatMap((table) => table.block_pair),
		block_pin_group: tables.flatMap((table) => table.block_pin_group),
		block_pin_target: tables.flatMap((table) => table.block_pin_target),
		block_rule: tables.flatMap((table) => table.block_rule),
		program: tables.flatMap((table) => table.program),
		program_goal: tables.flatMap((table) => table.program_goal),
		program_hip_plane: tables.flatMap((table) => table.program_hip_plane),
		program_outside_gym: tables.flatMap((table) => table.program_outside_gym),
		program_progression: tables.flatMap((table) => table.program_progression),
		program_timing: tables.flatMap((table) => table.program_timing),
		program_volume: tables.flatMap((table) => table.program_volume)
	};
};

const blocksOf = (
	declared: Readonly<Record<string, SourceProgramBlocks>>,
	programId: string
): SourceProgramBlocks => {
	const blocks = declared[programId];
	if (blocks === undefined) throw new TypeError(NO_BLOCKS + programId);
	return blocks;
};

const goalRows = (program: SourceProgram, ids: CatalogIds): readonly Row[] =>
	[
		...program.goals.primary.map((slug, at) => ({ at, priority: PRIORITY.primary, slug })),
		...program.goals.secondary.map((slug, at) => ({ at, priority: PRIORITY.secondary, slug }))
	].map(({ at, priority, slug }) => ({
		goal_id: idOf(ids.goalIdBySlug, slug, NO_GOAL),
		ord: at + FIRST_ORD,
		priority,
		program_id: program.id
	}));

const hipPlaneRows = (program: SourceProgram): readonly Row[] =>
	program.hipPlanes.map((plane, at) => ({
		hip_plane: plane,
		ord: at + FIRST_ORD,
		program_id: program.id
	}));

const outsideGymRows = (program: SourceProgram): readonly Row[] =>
	program.outsideGym.map((item) => ({
		intensity: item.intensity ?? null,
		key: item.key,
		minutes: item.minutes,
		name: item.name,
		per_week: item.perWeek,
		program_id: program.id
	}));

const programRow = (program: SourceProgram, blocks: SourceProgramBlocks): Row => ({
	free_weight_kg_max: program.contraindications.freeWeightKgMax,
	id: program.id,
	no_axial_load: program.contraindications.axialLoad,
	no_lumbar_extension: program.contraindications.lumbarExtension,
	no_lumbar_flexion: program.contraindications.lumbarFlexion,
	person_id: program.person,
	session_budget_min: program.sessionBudgetMin,
	sessions_per_week: program.sessionsPerWeek,
	slug: blocks.slug,
	title: program.title
});

const progressionRows = ({ id, progression }: SourceProgram): readonly Row[] => [
	{ key: PROGRESSION_KEY.pinned, program_id: id, text: progression.pinned },
	{ key: PROGRESSION_KEY.drawn, program_id: id, text: progression.drawn },
	{ key: PROGRESSION_KEY.isometric, program_id: id, text: progression.isometric },
	{ key: PROGRESSION_KEY.stop_rule, program_id: id, text: progression.stopRule }
];

const timingRows = ({ id, timing }: SourceProgram): readonly Row[] => [
	{ key: TIMING_KEY.work_per_set, program_id: id, sec: timing.workSecPerSet },
	{ key: TIMING_KEY.rest_strength, program_id: id, sec: timing.restSecStrength },
	{ key: TIMING_KEY.rest_accessory, program_id: id, sec: timing.restSecAccessory },
	{ key: TIMING_KEY.transition, program_id: id, sec: timing.transitionSec },
	{ key: TIMING_KEY.hold_rest, program_id: id, sec: timing.holdRestSec },
	...(timing.warmupGeneralMin === undefined
		? []
		: [
				{
					key: TIMING_KEY.warmup_general,
					program_id: id,
					sec: timing.warmupGeneralMin * SECONDS_IN_MINUTE
				}
			])
];

const volumeRows = (program: SourceProgram, ids: CatalogIds): readonly Row[] =>
	program.volumes.map((volume) => ({
		max_sets: volume.max,
		min_sets: volume.min,
		program_id: program.id,
		target_group_id: idOf(ids.targetGroupIdBySlug, volume.group, NO_TARGET_GROUP)
	}));
