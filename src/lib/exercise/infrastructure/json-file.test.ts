import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { readJsonArray, readJsonFile, writeJsonFile } from './json-file.ts';

const directory = mkdtempSync(path.join(tmpdir(), 'exercise-json-'));
const arrayFile = path.join(directory, 'array.json');
const objectFile = path.join(directory, 'object.json');
writeFileSync(arrayFile, JSON.stringify([1, 2]), 'utf8');
writeFileSync(objectFile, JSON.stringify({ a: 1 }), 'utf8');

describe('json-file', () => {
	it('читает массив и объект', () => {
		expect(readJsonArray(arrayFile)).toEqual([1, 2]);
		expect(readJsonFile(objectFile)).toEqual({ a: 1 });
	});

	it('требует массив там, где ждёт массив', () => {
		expect(() => readJsonArray(objectFile)).toThrow('ожидается массив JSON');
	});

	it('пишет JSON табами и с переводом строки на конце', () => {
		const out = path.join(directory, 'out.json');
		writeJsonFile(out, [{ a: 1 }]);
		expect(readFileSync(out, 'utf8')).toBe('[\n\t{\n\t\t"a": 1\n\t}\n]\n');
	});
});
