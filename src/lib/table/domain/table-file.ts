import type { TableName } from './table.ts';

const OBJECT_KIND = 'object';
const STRING_KIND = 'string';
const NUMBER_KIND = 'number';
const BOOLEAN_KIND = 'boolean';
const SCALAR_KINDS: ReadonlySet<string> = new Set([BOOLEAN_KIND, NUMBER_KIND, STRING_KIND]);

export type RawRow = Readonly<Record<string, unknown>>;

export interface TableFile {
	readonly lines: readonly TableLine[];
	readonly name: string;
}

export interface TableLine {
	readonly at: number;
	readonly parsed: unknown;
	readonly text: string;
}

export interface TableSet {
	readonly files: readonly TableFile[];
}

export const fileOf = (set: TableSet, name: TableName): TableFile | undefined =>
	set.files.find((file) => file.name === name);

export const isPlainObject = (value: unknown): value is RawRow =>
	typeof value === OBJECT_KIND && value !== null && !Array.isArray(value);

export const isScalar = (value: unknown): boolean =>
	value === null || SCALAR_KINDS.has(typeof value);

export const rowsOf = (set: TableSet, name: TableName): readonly RawRow[] =>
	(fileOf(set, name)?.lines ?? [])
		.map((line) => line.parsed)
		.filter((parsed) => isPlainObject(parsed));

export const textAt = (row: RawRow, column: string): string => String(row[column]);
