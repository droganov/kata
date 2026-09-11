import { readFileSync } from 'node:fs';

const ENCODING = 'utf8';

export function readJsonArray(file: string): readonly unknown[] {
	const parsed = readJsonFile(file);
	if (!Array.isArray(parsed)) throw new TypeError(`${file}: ожидается массив JSON`);
	return parsed as readonly unknown[];
}

export function readJsonFile(file: string): unknown {
	const parsed: unknown = JSON.parse(readFileSync(file, ENCODING));
	return parsed;
}
