import type { CatalogIds } from './catalog-ids.ts';
import type { SourceBlock, SourceProgramBlocks } from './program-blocks.ts';
import type {
	SourceCatalog,
	SourceFile,
	SourceProgram,
	SourceSection,
	SourceSlot
} from './source-catalog.ts';
import type { Row } from './table.ts';

import { idOf } from './catalog-ids.ts';
import { derivedId } from './derived-id.ts';

const FIRST_ORD = 1;
const RULE_MARK = 'rule';
const EXCLUDED_MARK = 'excluded';
const PAIR_SEPARATOR = '|';
const NO_FILE = 'файл каталога Блока не найден: ';
const NO_GROUP = 'группа мышц не найдена: ';
const NO_PAIR_BLOCK = 'упражнение пары не стоит ни в одном Блоке: ';
const NO_PAIR_GROUP = 'у пары нет группы мышц: ';
const NO_SLOT = 'пара ссылается на неизвестный slots[].id: ';
const NO_TARGET = 'упражнение не легло в каталог: ';
const MIXED_TARGETS = 'кандидаты slots[] лежат в разных мишенях: ';
const MIXED_SEC_EACH = 'значения sec_each Блока расходятся: ';

export interface BlockTables {
	readonly block: readonly Row[];
	readonly block_draw: readonly Row[];
	readonly block_excluded: readonly Row[];
	readonly block_pair: readonly Row[];
	readonly block_pin_group: readonly Row[];
	readonly block_pin_target: readonly Row[];
	readonly block_rule: readonly Row[];
}

interface PlacedBlock {
	readonly declared?: SourceBlock;
	readonly file: SourceFile;
	readonly ord: number;
	readonly program: SourceProgram;
	readonly source: SourceSection;
}

interface RuleText {
	readonly group: null | string;
	readonly text: string;
}

export const blockTablesOf = (
	catalog: SourceCatalog,
	program: SourceProgram,
	declared: SourceProgramBlocks,
	ids: CatalogIds
): BlockTables => {
	const blocks = program.sections.map((source, at) =>
		placedBlock(catalog, declared, program, source, at)
	);
	return {
		block: blocks.map((block) => blockRow(block)),
		block_draw: blocks.flatMap((block) => drawRows(block)),
		block_excluded: blocks.flatMap((block) => excludedRows(block)),
		block_pair: pairRows(program, ids),
		block_pin_group: blocks.flatMap((block) => pinGroupRows(block, ids)),
		block_pin_target: blocks.flatMap((block) => pinTargetRows(block, ids)),
		block_rule: blocks.flatMap((block) => ruleRows(block, ids))
	};
};

const blockRow = ({ declared, file, ord, program, source }: PlacedBlock): Row => ({
	budget_sec: file.sessionBudgetSec ?? null,
	id: source.id,
	modality: source.mode,
	name: declared?.name ?? source.title,
	ord,
	program_id: program.id,
	slug: source.slug
});

const drawRows = ({ declared, source }: PlacedBlock): readonly Row[] => {
	const draw = declared?.draw;
	if (draw === undefined) return [];
	const secEach = new Set(source.slots.flatMap((slot) => slot.secEach ?? []));
	if (secEach.size > 1) throw new TypeError(MIXED_SEC_EACH + source.slug);
	return [
		{
			block_id: source.id,
			count: draw.count,
			level: draw.level,
			pick_each: draw.pickEach,
			sec_each: secEach.values().toArray()[0] ?? null
		}
	];
};

const excludedRows = ({ file, source }: PlacedBlock): readonly Row[] =>
	file.excluded.map((item, at) => ({
		block_id: source.id,
		id: derivedId([source.id, EXCLUDED_MARK, item.name]),
		name: item.name,
		ord: at + FIRST_ORD,
		reason: item.reason
	}));

const majorityGroupOf = (slot: SourceSlot, ids: CatalogIds): string => {
	const counts = new Map<string, number>();
	for (const exercise of slot.exercises) {
		const target = idOf(ids.targetIdByExercise, exercise, NO_TARGET);
		const group = ids.groupIdByTarget.get(target);
		if (group !== undefined) counts.set(group, (counts.get(group) ?? 0) + 1);
	}
	const [first] = counts
		.entries()
		.toArray()
		.toSorted(
			([leftGroup, left], [rightGroup, right]) =>
				right - left ||
				idOf(ids.groupOrdById, leftGroup, NO_GROUP) -
					idOf(ids.groupOrdById, rightGroup, NO_GROUP)
		);
	if (first === undefined) throw new TypeError(NO_PAIR_GROUP + slot.id);
	return first[0];
};

const pairRows = (program: SourceProgram, ids: CatalogIds): readonly Row[] => {
	const slots = new Map(
		program.sections.flatMap((source) => source.slots.map((slot) => [slot.id, slot]))
	);
	const rows = new Map<string, Row>();
	for (const pairing of program.pairings) {
		const whenGroup = majorityGroupOf(idOf(slots, pairing.slot, NO_SLOT), ids);
		for (const exercise of pairing.exercises) {
			const block = program.sections.find((source) =>
				source.slots.some((slot) => slot.exercises.includes(exercise))
			);
			if (block === undefined) throw new TypeError(NO_PAIR_BLOCK + exercise);
			const thenTarget = idOf(ids.targetIdByExercise, exercise, NO_TARGET);
			rows.set([block.id, whenGroup, thenTarget].join(PAIR_SEPARATOR), {
				block_id: block.id,
				then_target_id: thenTarget,
				when_group_id: whenGroup
			});
		}
	}
	return rows.values().toArray();
};

const pinGroupRows = ({ declared, source }: PlacedBlock, ids: CatalogIds): readonly Row[] =>
	(declared?.pinnedGroups ?? []).map((pin, at) => ({
		block_id: source.id,
		muscle_group_id: idOf(ids.groupIdBySlug, pin.slug, NO_GROUP),
		ord: at + FIRST_ORD,
		pick: pin.pick
	}));

const pinTargetRows = ({ declared, source }: PlacedBlock, ids: CatalogIds): readonly Row[] =>
	declared === undefined
		? source.slots.map((slot, at) => ({
				block_id: source.id,
				ord: at + FIRST_ORD,
				pick: slot.pick ?? slot.exercises.length,
				sec_each: slot.secEach ?? null,
				target_id: slotTargetOf(slot, ids)
			}))
		: [];

const placedBlock = (
	catalog: SourceCatalog,
	declared: SourceProgramBlocks,
	program: SourceProgram,
	source: SourceSection,
	at: number
): PlacedBlock => {
	const file = catalog.files.find((item) => item.id === source.bank);
	if (file === undefined) throw new TypeError(NO_FILE + source.slug);
	const block = declared.blocks[source.slug];
	return {
		...(block !== undefined && { declared: block }),
		file,
		ord: at + FIRST_ORD,
		program,
		source
	};
};

const ruleRows = ({ file, source }: PlacedBlock, ids: CatalogIds): readonly Row[] =>
	[
		...file.groups.flatMap((group): readonly RuleText[] =>
			group.rule === undefined
				? []
				: [{ group: idOf(ids.groupIdBySlug, group.slug, NO_GROUP), text: group.rule }]
		),
		...file.rules.map((text): RuleText => ({ group: null, text }))
	].map((rule, at) => ({
		block_id: source.id,
		id: derivedId([source.id, RULE_MARK, rule.text]),
		muscle_group_id: rule.group,
		ord: at + FIRST_ORD,
		text: rule.text
	}));

const slotTargetOf = (slot: SourceSlot, ids: CatalogIds): string => {
	const targets = new Set(
		slot.exercises.map((exercise) => idOf(ids.targetIdByExercise, exercise, NO_TARGET))
	);
	const [target] = targets;
	if (target === undefined || targets.size > 1) throw new TypeError(MIXED_TARGETS + slot.id);
	return target;
};
