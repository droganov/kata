import type { SessionGateways } from '../application/session-gateways.ts';
import type { Catalog } from '../domain/catalog.ts';
import type { DetailOracle, DetailStep, ExerciseDetail } from '../domain/exercise-detail.ts';
import type {
	Block,
	BlockDraw,
	BlockPair,
	BlockPin,
	Contraindications,
	DrawLevel,
	Program
} from '../domain/program.ts';
import type { TableRow, TableRows } from './bundled-tables.ts';

import { isDrawLevel } from '../domain/program.ts';

const NO_TABLE = 'таблицы нет: ';
const NOT_TEXT = 'в столбце нет строки: ';
const NOT_NUMBER = 'в столбце нет числа: ';
const NOT_FLAG = 'в столбце нет булева значения: ';
const NOT_LEVEL = 'уровень добора вне перечня: ';
const MODEL_SIDE = 'model';
const COUNTER_SIDE = 'counter';
const BOOLEAN_KIND = 'boolean';
const NUMBER_KIND = 'number';
const STRING_KIND = 'string';

const TABLE = {
	block: 'block',
	block_draw: 'block_draw',
	block_pair: 'block_pair',
	block_pin_group: 'block_pin_group',
	block_pin_target: 'block_pin_target',
	equipment: 'equipment',
	exercise: 'exercise',
	exercise_equipment: 'exercise_equipment',
	exercise_target: 'exercise_target',
	muscle_group: 'muscle_group',
	oracle: 'oracle',
	oracle_line: 'oracle_line',
	program: 'program',
	step: 'step',
	step_target: 'step_target',
	target: 'target'
} as const;

const COLUMN = {
	axial: 'axial',
	block_id: 'block_id',
	catalog_target_id: 'catalog_target_id',
	count: 'count',
	dose: 'dose',
	equipment_id: 'equipment_id',
	exercise_id: 'exercise_id',
	free_weight: 'free_weight',
	free_weight_kg_max: 'free_weight_kg_max',
	id: 'id',
	kg_max: 'kg_max',
	level: 'level',
	lumbar_ext: 'lumbar_ext',
	lumbar_flex: 'lumbar_flex',
	modality: 'modality',
	muscle_group_id: 'muscle_group_id',
	name: 'name',
	no_axial_load: 'no_axial_load',
	no_lumbar_extension: 'no_lumbar_extension',
	no_lumbar_flexion: 'no_lumbar_flexion',
	note: 'note',
	oracle_id: 'oracle_id',
	ord: 'ord',
	pick: 'pick',
	pick_each: 'pick_each',
	predicate: 'predicate',
	program_id: 'program_id',
	role: 'role',
	side: 'side',
	slug: 'slug',
	step_id: 'step_id',
	target_id: 'target_id',
	text: 'text',
	then_target_id: 'then_target_id',
	title: 'title',
	when_group_id: 'when_group_id'
} as const;

export const createTableGateways = (tables: TableRows): SessionGateways => {
	const catalog = catalogOf(tables);
	const details = detailsOf(tables);
	const programs = programsOf(tables);
	return {
		catalog: { readCatalog: () => catalog },
		details: { readDetails: () => details },
		programs: { readPrograms: () => programs }
	};
};

const blockOf = (tables: TableRows, row: TableRow): Block => {
	const id = textOf(row, COLUMN.id);
	const draw = drawOf(tables, id);
	return {
		...(draw !== undefined && { draw }),
		id,
		modality: textOf(row, COLUMN.modality),
		name: textOf(row, COLUMN.name),
		ord: numberOf(row, COLUMN.ord),
		pairs: pairsOf(tables, id),
		pinnedGroups: pinsOf(tables, TABLE.block_pin_group, COLUMN.muscle_group_id, id),
		pinnedTargets: pinsOf(tables, TABLE.block_pin_target, COLUMN.target_id, id)
	};
};

const catalogOf = (tables: TableRows): Catalog => ({
	exercises: rowsOf(tables, TABLE.exercise).map((row) => {
		const kgMax = optionalNumberOf(row, COLUMN.kg_max);
		return {
			axial: hasFlag(row, COLUMN.axial),
			catalogTarget: textOf(row, COLUMN.catalog_target_id),
			dose: textOf(row, COLUMN.dose),
			freeWeight: hasFlag(row, COLUMN.free_weight),
			id: textOf(row, COLUMN.id),
			...(kgMax !== undefined && { kgMax }),
			lumbarExt: hasFlag(row, COLUMN.lumbar_ext),
			lumbarFlex: hasFlag(row, COLUMN.lumbar_flex),
			modality: textOf(row, COLUMN.modality),
			name: textOf(row, COLUMN.name),
			slug: textOf(row, COLUMN.slug)
		};
	}),
	muscleGroups: rowsOf(tables, TABLE.muscle_group).map((row) => ({
		id: textOf(row, COLUMN.id),
		ord: numberOf(row, COLUMN.ord)
	})),
	targets: rowsOf(tables, TABLE.target).map((row) => {
		const muscleGroup =
			row[COLUMN.muscle_group_id] === null ? undefined : textOf(row, COLUMN.muscle_group_id);
		return {
			id: textOf(row, COLUMN.id),
			...(muscleGroup !== undefined && { muscleGroup }),
			slug: textOf(row, COLUMN.slug)
		};
	})
});

const contraindicationsOf = (row: TableRow): Contraindications => {
	const freeWeightKgMax = optionalNumberOf(row, COLUMN.free_weight_kg_max);
	return {
		...(freeWeightKgMax !== undefined && { freeWeightKgMax }),
		noAxialLoad: hasFlag(row, COLUMN.no_axial_load),
		noLumbarExtension: hasFlag(row, COLUMN.no_lumbar_extension),
		noLumbarFlexion: hasFlag(row, COLUMN.no_lumbar_flexion)
	};
};

const detailsOf = (tables: TableRows): ReadonlyMap<string, ExerciseDetail> => {
	const equipmentNames = namesOf(tables, TABLE.equipment);
	const targetNames = namesOf(tables, TABLE.target);
	const equipment = groupedBy(tables, TABLE.exercise_equipment, COLUMN.exercise_id);
	const targets = groupedBy(tables, TABLE.exercise_target, COLUMN.exercise_id);
	const steps = groupedBy(tables, TABLE.step, COLUMN.exercise_id);
	const actives = groupedBy(tables, TABLE.step_target, COLUMN.step_id);
	const oracles = groupedBy(tables, TABLE.oracle, COLUMN.step_id);
	const lines = groupedBy(tables, TABLE.oracle_line, COLUMN.oracle_id);
	const oracleOf = (row: TableRow): DetailOracle => {
		const id = textOf(row, COLUMN.id);
		const own = inOrder(lines.get(id) ?? []);
		return {
			counterModel: sideOf(own, COUNTER_SIDE),
			id,
			model: sideOf(own, MODEL_SIDE),
			predicate: textOf(row, COLUMN.predicate)
		};
	};
	const stepOf = (row: TableRow): DetailStep => {
		const id = textOf(row, COLUMN.id);
		return {
			active: (actives.get(id) ?? []).map((link) =>
				nameOf(targetNames, textOf(link, COLUMN.target_id))
			),
			id,
			oracles: inOrder(oracles.get(id) ?? []).map((oracle) => oracleOf(oracle)),
			title: textOf(row, COLUMN.title)
		};
	};
	return new Map(
		rowsOf(tables, TABLE.exercise).map((row) => {
			const id = textOf(row, COLUMN.id);
			const note = row[COLUMN.note] === null ? undefined : textOf(row, COLUMN.note);
			return [
				id,
				{
					equipment: (equipment.get(id) ?? []).map((link) => ({
						name: nameOf(equipmentNames, textOf(link, COLUMN.equipment_id)),
						role: textOf(link, COLUMN.role)
					})),
					...(note !== undefined && { note }),
					steps: inOrder(steps.get(id) ?? []).map((step) => stepOf(step)),
					targets: (targets.get(id) ?? []).map((link) => ({
						name: nameOf(targetNames, textOf(link, COLUMN.target_id)),
						role: textOf(link, COLUMN.role)
					}))
				}
			];
		})
	);
};

const drawOf = (tables: TableRows, block: string): BlockDraw | undefined =>
	rowsOf(tables, TABLE.block_draw)
		.filter((row) => textOf(row, COLUMN.block_id) === block)
		.map((row) => ({
			count: numberOf(row, COLUMN.count),
			level: levelOf(row),
			pickEach: numberOf(row, COLUMN.pick_each)
		}))[0];

const hasFlag = (row: TableRow, column: string): boolean => {
	const value = row[column];
	if (!isFlag(value)) throw new TypeError(NOT_FLAG + column);
	return value;
};

const groupedBy = (
	tables: TableRows,
	table: string,
	column: string
): ReadonlyMap<string, readonly TableRow[]> => {
	const groups = new Map<string, TableRow[]>();
	for (const row of rowsOf(tables, table)) {
		const key = textOf(row, column);
		groups.set(key, [...(groups.get(key) ?? []), row]);
	}
	return groups;
};

const inOrder = (rows: readonly TableRow[]): readonly TableRow[] =>
	rows.toSorted((first, second) => numberOf(first, COLUMN.ord) - numberOf(second, COLUMN.ord));

const isFlag = (value: unknown): value is boolean => typeof value === BOOLEAN_KIND;

const isNumber = (value: unknown): value is number => typeof value === NUMBER_KIND;

const isText = (value: unknown): value is string => typeof value === STRING_KIND;

const levelOf = (row: TableRow): DrawLevel => {
	const level = textOf(row, COLUMN.level);
	if (!isDrawLevel(level)) throw new TypeError(NOT_LEVEL + level);
	return level;
};

const nameOf = (names: ReadonlyMap<string, string>, id: string): string => names.get(id) ?? id;

const namesOf = (tables: TableRows, table: string): ReadonlyMap<string, string> =>
	new Map(rowsOf(tables, table).map((row) => [textOf(row, COLUMN.id), textOf(row, COLUMN.name)]));

const numberOf = (row: TableRow, column: string): number => {
	const value = row[column];
	if (!isNumber(value)) throw new TypeError(NOT_NUMBER + column);
	return value;
};

const optionalNumberOf = (row: TableRow, column: string): number | undefined =>
	row[column] === null ? undefined : numberOf(row, column);

const pairsOf = (tables: TableRows, block: string): readonly BlockPair[] =>
	rowsOf(tables, TABLE.block_pair)
		.filter((row) => textOf(row, COLUMN.block_id) === block)
		.map((row) => ({
			thenTarget: textOf(row, COLUMN.then_target_id),
			whenGroup: textOf(row, COLUMN.when_group_id)
		}));

const pinsOf = (
	tables: TableRows,
	table: string,
	column: string,
	block: string
): readonly BlockPin[] =>
	rowsOf(tables, table)
		.filter((row) => textOf(row, COLUMN.block_id) === block)
		.map((row) => ({
			id: textOf(row, column),
			ord: numberOf(row, COLUMN.ord),
			pick: numberOf(row, COLUMN.pick)
		}));

const programsOf = (tables: TableRows): readonly Program[] =>
	rowsOf(tables, TABLE.program).map((row) => {
		const id = textOf(row, COLUMN.id);
		return {
			blocks: rowsOf(tables, TABLE.block)
				.filter((block) => textOf(block, COLUMN.program_id) === id)
				.map((block) => blockOf(tables, block)),
			contraindications: contraindicationsOf(row),
			id,
			title: textOf(row, COLUMN.title)
		};
	});

const rowsOf = (tables: TableRows, table: string): readonly TableRow[] => {
	const rows = tables.get(table);
	if (rows === undefined) throw new Error(NO_TABLE + table);
	return rows;
};

const textOf = (row: TableRow, column: string): string => {
	const value = row[column];
	if (!isText(value)) throw new TypeError(NOT_TEXT + column);
	return value;
};

const sideOf = (lines: readonly TableRow[], side: string): readonly string[] =>
	lines
		.filter((line) => textOf(line, COLUMN.side) === side)
		.map((line) => textOf(line, COLUMN.text));
