import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { readJsonArray, readJsonFile } from './json-file.ts';

const directory = mkdtempSync(path.join(tmpdir(), 'program-json-'));
const arrayFile = path.join(directory, 'array.json');
const objectFile = path.join(directory, 'object.json');
writeFileSync(arrayFile, JSON.stringify([{ id: 'a' }]), 'utf8');
writeFileSync(objectFile, JSON.stringify({ id: 'a' }), 'utf8');

describe('json-file', () => {
	it('читает JSON файл', () => {
		expect(readJsonFile(objectFile)).toEqual({ id: 'a' });
	});

	it('читает массив и ругается на не массив', () => {
		expect(readJsonArray(arrayFile)).toEqual([{ id: 'a' }]);
		expect(() => readJsonArray(objectFile)).toThrow('ожидается массив JSON');
	});
});
