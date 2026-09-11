import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { readJsonArray, readJsonFile } from './json-file.ts';

const directory = mkdtempSync(path.join(tmpdir(), 'catalog-json-'));
const fileWith = (name: string, content: string): string => {
	const file = path.join(directory, name);
	writeFileSync(file, content, 'utf8');
	return file;
};

describe('readJsonFile', () => {
	it('читает объект из файла', () => {
		expect(readJsonFile(fileWith('object.json', '{"slug":"body"}'))).toEqual({ slug: 'body' });
	});
});

describe('readJsonArray', () => {
	it('читает массив из файла', () => {
		expect(readJsonArray(fileWith('array.json', '[1,2]'))).toEqual([1, 2]);
	});

	it('отказывается читать не массив', () => {
		const file = fileWith('not-array.json', '{"slug":"body"}');
		expect(() => readJsonArray(file)).toThrow('ожидается массив');
	});
});
