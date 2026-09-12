import { readFileSync, writeFileSync } from 'node:fs';

const ENCODING = 'utf8';
const INDENT = '\t';
const LINE_END = '\n';

const isUnknownArray = (value: unknown): value is readonly unknown[] => Array.isArray(value);

export const readJsonArray = (file: string): readonly unknown[] => {
	const parsed = readJsonFile(file);
	if (!isUnknownArray(parsed)) throw new TypeError(`${file}: ожидается массив JSON`);
	return parsed;
};

export const readJsonFile = (file: string): unknown => {
	const parsed: unknown = JSON.parse(readFileSync(file, ENCODING));
	return parsed;
};

export const writeJsonFile = (file: string, value: unknown): void => {
	writeFileSync(file, `${JSON.stringify(value, null, INDENT)}${LINE_END}`, ENCODING);
};
