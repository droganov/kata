import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { readJsonArray, readJsonFile } from './json-file.ts';

const directory = mkdtempSync(path.join(tmpdir(), 'table-json-'));
const arrayFile = path.join(directory, 'array.json');
const objectFile = path.join(directory, 'object.json');
writeFileSync(arrayFile, JSON.stringify([1, 2]), 'utf8');
writeFileSync(objectFile, JSON.stringify({ a: 1 }), 'utf8');

describe('readJsonFile', () => {
	it('читает любой JSON', () => {
		expect(readJsonFile(objectFile)).toEqual({ a: 1 });
	});
});

describe('readJsonArray', () => {
	it('читает массив и бросает на объекте', () => {
		expect(readJsonArray(arrayFile)).toEqual([1, 2]);
		expect(() => readJsonArray(objectFile)).toThrow('ожидается массив JSON');
	});
});
