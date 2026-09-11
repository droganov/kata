import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import type { TableRepository } from '../application/table-repository.ts';
import type { TableFile, TableLine, TableSet } from '../domain/table-file.ts';
import type { TableName, Tables } from '../domain/table.ts';

import { tableNames, tupleOf } from '../domain/table.ts';

const ENCODING = 'utf8';
const JSONL_SUFFIX = '.jsonl';
const LINE_BREAK = '\n';
const FIRST_LINE = 1;

export interface JsonlTableSource {
	readonly directory: string;
}

export function createJsonlTableRepository(source: JsonlTableSource): TableRepository {
	return {
		readAll: (): TableSet => ({ files: tableFiles(source.directory) }),
		writeAll: (tables: Tables): void => {
			for (const name of tableNames())
				writeFileSync(
					path.join(source.directory, name + JSONL_SUFFIX),
					serialized(name, tables),
					ENCODING
				);
		}
	};
}

function parsedLine(text: string): unknown {
	try {
		const parsed: unknown = JSON.parse(text);
		return parsed;
	} catch {
		return text;
	}
}

function serialized(name: TableName, tables: Tables): string {
	return (
		tables[name].map((row) => JSON.stringify(tupleOf(name, row))).join(LINE_BREAK) + LINE_BREAK
	);
}

function tableFiles(directory: string): readonly TableFile[] {
	return readdirSync(directory)
		.filter((name) => name.endsWith(JSONL_SUFFIX))
		.toSorted((first, second) => first.localeCompare(second))
		.map((name) => ({
			lines: tableLines(readFileSync(path.join(directory, name), ENCODING)),
			name: name.slice(0, -JSONL_SUFFIX.length)
		}));
}

function tableLines(text: string): readonly TableLine[] {
	return text
		.split(LINE_BREAK)
		.map((line, at) => ({ at: at + FIRST_LINE, text: line }))
		.filter((line) => line.text.trim().length > 0)
		.map((line) => ({ ...line, parsed: parsedLine(line.text) }));
}
