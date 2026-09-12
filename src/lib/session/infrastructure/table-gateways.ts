import type { SessionGateways } from '../application/session-gateways.ts';
import type { Catalog } from '../domain/catalog.ts';
import type { Block, BlockDraw, BlockPin, DrawLevel, Program } from '../domain/program.ts';
import type { TableRow, TableRows } from './bundled-tables.ts';

import { isDrawLevel } from '../domain/program.ts';

const NO_TABLE = 'таблицы нет: ';
const NOT_TEXT = 'в столбце нет строки: ';
const NOT_NUMBER = 'в столбце нет числа: ';
const NOT_LEVEL = 'уровень добора вне перечня: ';
const NUMBER_KIND = 'number';
const STRING_KIND = 'string';

const TABLE = {
	block: 'block',
	block_draw: 'block_draw',
	block_pin_group: 'block_pin_group',
	block_pin_target: 'block_pin_target',
	exercise: 'exercise',
	muscle_group: 'muscle_group',
	program: 'program',
	target: 'target'
} as const;

const COLUMN = {
	block_id: 'block_id',
	catalog_target_id: 'catalog_target_id',
	count: 'count',
	dose: 'dose',
	id: 'id',
	level: 'level',
	modality: 'modality',
	muscle_group_id: 'muscle_group_id',
	name: 'name',
	ord: 'ord',
	pick: 'pick',
	pick_each: 'pick_each',
	program_id: 'program_id',
	slug: 'slug',
	target_id: 'target_id',
	title: 'title'
} as const;

export const createTableGateways = (tables: TableRows): SessionGateways => {
	const catalog = catalogOf(tables);
	const programs = programsOf(tables);
	return {
		catalog: { readCatalog: () => catalog },
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
		pinnedGroups: pinsOf(tables, TABLE.block_pin_group, COLUMN.muscle_group_id, id),
		pinnedTargets: pinsOf(tables, TABLE.block_pin_target, COLUMN.target_id, id)
	};
};

const catalogOf = (tables: TableRows): Catalog => ({
	exercises: rowsOf(tables, TABLE.exercise).map((row) => ({
		catalogTarget: textOf(row, COLUMN.catalog_target_id),
		dose: textOf(row, COLUMN.dose),
		id: textOf(row, COLUMN.id),
		modality: textOf(row, COLUMN.modality),
		name: textOf(row, COLUMN.name),
		slug: textOf(row, COLUMN.slug)
	})),
	muscleGroups: rowsOf(tables, TABLE.muscle_group).map((row) => ({
		id: textOf(row, COLUMN.id),
		ord: numberOf(row, COLUMN.ord)
	})),
	targets: rowsOf(tables, TABLE.target).map((row) => ({
		id: textOf(row, COLUMN.id),
		muscleGroup: textOf(row, COLUMN.muscle_group_id),
		slug: textOf(row, COLUMN.slug)
	}))
});

const drawOf = (tables: TableRows, block: string): BlockDraw | undefined =>
	rowsOf(tables, TABLE.block_draw)
		.filter((row) => textOf(row, COLUMN.block_id) === block)
		.map((row) => ({
			count: numberOf(row, COLUMN.count),
			level: levelOf(row),
			pickEach: numberOf(row, COLUMN.pick_each)
		}))[0];

const isNumber = (value: unknown): value is number => typeof value === NUMBER_KIND;

const isText = (value: unknown): value is string => typeof value === STRING_KIND;

const levelOf = (row: TableRow): DrawLevel => {
	const level = textOf(row, COLUMN.level);
	if (!isDrawLevel(level)) throw new TypeError(NOT_LEVEL + level);
	return level;
};

const numberOf = (row: TableRow, column: string): number => {
	const value = row[column];
	if (!isNumber(value)) throw new TypeError(NOT_NUMBER + column);
	return value;
};

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
