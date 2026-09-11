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

export function fileOf(set: TableSet, name: TableName): TableFile | undefined {
	return set.files.find((file) => file.name === name);
}

export function isPlainObject(value: unknown): value is RawRow {
	return typeof value === OBJECT_KIND && value !== null && !Array.isArray(value);
}

export function isScalar(value: unknown): boolean {
	return value === null || SCALAR_KINDS.has(typeof value);
}

export function rowsOf(set: TableSet, name: TableName): readonly RawRow[] {
	return (fileOf(set, name)?.lines ?? [])
		.map((line) => line.parsed)
		.filter((parsed) => isPlainObject(parsed));
}

export function textAt(row: RawRow, column: string): string {
	return String(row[column]);
}
