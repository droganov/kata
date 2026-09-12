import type { SourceBlock, SourceProgramBlocks } from './program-blocks.ts';
import type { SourceProgram } from './source-catalog.ts';
import type { Row } from './table.ts';

import { derivedId } from './derived-id.ts';

const FIRST_ORD = 1;
const BLOCK_MARK = 'block';
const COLUMN_MUSCLE_GROUP = 'muscle_group_id';
const COLUMN_TARGET = 'target_id';
const NO_BLOCKS = 'Блоки программы не объявлены: ';
const NO_GROUP = 'группа мышц не найдена: ';
const NO_TARGET = 'мишень не найдена: ';

export interface CatalogIds {
	readonly groupIdBySlug: ReadonlyMap<string, string>;
	readonly targetIdBySlug: ReadonlyMap<string, string>;
}

export interface ProgramTables {
	readonly block: readonly Row[];
	readonly block_draw: readonly Row[];
	readonly block_pin_group: readonly Row[];
	readonly block_pin_target: readonly Row[];
	readonly program: readonly Row[];
}

interface NumberedBlock {
	readonly id: string;
	readonly ord: number;
	readonly program: string;
	readonly source: SourceBlock;
}

export const programTablesOf = (
	programs: readonly SourceProgram[],
	declared: Readonly<Record<string, SourceProgramBlocks>>,
	ids: CatalogIds
): ProgramTables => {
	const sources = programs.map((program) => ({
		declared: blocksOf(declared, program.id),
		program
	}));
	const blocks: readonly NumberedBlock[] = sources.flatMap(({ declared: source, program }) =>
		source.blocks.map((block, at) => ({
			id: derivedId([program.id, BLOCK_MARK, block.name]),
			ord: at + FIRST_ORD,
			program: program.id,
			source: block
		}))
	);
	return {
		block: blocks.map((block) => ({
			id: block.id,
			modality: block.source.modality,
			name: block.source.name,
			ord: block.ord,
			program_id: block.program
		})),
		block_draw: blocks.flatMap(({ id, source }) =>
			source.draw === undefined
				? []
				: [
						{
							block_id: id,
							count: source.draw.count,
							level: source.draw.level,
							pick_each: source.draw.pickEach
						}
					]
		),
		block_pin_group: blocks.flatMap((block) =>
			pinRows(block.id, block.source.pinnedGroups, COLUMN_MUSCLE_GROUP, (slug) =>
				idOf(ids.groupIdBySlug, slug, NO_GROUP)
			)
		),
		block_pin_target: blocks.flatMap((block) =>
			pinRows(block.id, block.source.pinnedTargets, COLUMN_TARGET, (slug) =>
				idOf(ids.targetIdBySlug, slug, NO_TARGET)
			)
		),
		program: sources.map(({ declared: source, program }) => programRow(program, source))
	};
};

const blocksOf = (
	declared: Readonly<Record<string, SourceProgramBlocks>>,
	programId: string
): SourceProgramBlocks => {
	const source = declared[programId];
	if (source === undefined) throw new TypeError(NO_BLOCKS + programId);
	return source;
};

const idOf = (ids: ReadonlyMap<string, string>, slug: string, missing: string): string => {
	const id = ids.get(slug);
	if (id === undefined) throw new TypeError(missing + slug);
	return id;
};

const pinRows = (
	block: string,
	pins: SourceBlock['pinnedGroups'],
	column: string,
	idBySlug: (slug: string) => string
): readonly Row[] =>
	pins.map((pin, at) => ({
		block_id: block,
		[column]: idBySlug(pin.slug),
		ord: at + FIRST_ORD,
		pick: pin.pick
	}));

const programRow = (program: SourceProgram, source: SourceProgramBlocks): Row => ({
	free_weight_kg_max: program.contraindications.freeWeightKgMax,
	id: program.id,
	no_axial_load: program.contraindications.axialLoad,
	no_lumbar_extension: program.contraindications.lumbarExtension,
	no_lumbar_flexion: program.contraindications.lumbarFlexion,
	person_id: program.person,
	session_budget_min: program.sessionBudgetMin,
	sessions_per_week: program.sessionsPerWeek,
	slug: source.slug,
	title: source.title
});
