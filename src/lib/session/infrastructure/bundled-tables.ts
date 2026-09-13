const LINE_BREAK = '\n';
const PATH_SEPARATOR = '/';
const JSONL_SUFFIX = '.jsonl';
const OBJECT_KIND = 'object';
const NOT_ROW = 'строка таблицы не объект JSON: ';

export type TableRow = Readonly<Record<string, unknown>>;

export type TableRows = ReadonlyMap<string, readonly TableRow[]>;

const TABLE_FILES = import.meta.glob<string>(
	[
		'/data/block.jsonl',
		'/data/block_draw.jsonl',
		'/data/block_pair.jsonl',
		'/data/block_pin_group.jsonl',
		'/data/block_pin_target.jsonl',
		'/data/equipment.jsonl',
		'/data/exercise.jsonl',
		'/data/exercise_equipment.jsonl',
		'/data/exercise_target.jsonl',
		'/data/muscle_group.jsonl',
		'/data/oracle.jsonl',
		'/data/oracle_line.jsonl',
		'/data/program.jsonl',
		'/data/step.jsonl',
		'/data/step_target.jsonl',
		'/data/target.jsonl'
	],
	{ eager: true, import: 'default', query: '?raw' }
);

export const tableRowsOf = (files: Readonly<Record<string, string>>): TableRows =>
	new Map(Object.entries(files).map(([file, text]) => [tableNameOf(file), rowsOf(text)]));

const isRow = (value: unknown): value is TableRow =>
	typeof value === OBJECT_KIND && value !== null && !Array.isArray(value);

const rowOf = (line: string): TableRow => {
	const parsed: unknown = JSON.parse(line);
	if (!isRow(parsed)) throw new TypeError(NOT_ROW + line);
	return parsed;
};

const rowsOf = (text: string): readonly TableRow[] =>
	text
		.split(LINE_BREAK)
		.filter((line) => line.trim().length > 0)
		.map((line) => rowOf(line));

const tableNameOf = (file: string): string =>
	file.slice(file.lastIndexOf(PATH_SEPARATOR) + 1, -JSONL_SUFFIX.length);

export const BUNDLED_TABLES: TableRows = tableRowsOf(TABLE_FILES);
