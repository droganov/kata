import { readFileSync, writeFileSync } from 'node:fs';

const ENCODING = 'utf8';
const INDENT = '\t';
const LINE_END = '\n';

export function readJsonArray(file: string): readonly unknown[] {
	const parsed = readJsonFile(file);
	if (!Array.isArray(parsed)) throw new TypeError(`${file}: ожидается массив JSON`);
	return parsed as readonly unknown[];
}

export function readJsonFile(file: string): unknown {
	const parsed: unknown = JSON.parse(readFileSync(file, ENCODING));
	return parsed;
}

export function writeJsonFile(file: string, value: unknown): void {
	writeFileSync(file, `${JSON.stringify(value, null, INDENT)}${LINE_END}`, ENCODING);
}
