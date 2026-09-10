import { mkdtempSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { readJsonArray, readJsonFile, writeJsonFile } from './json-file.ts';

const directory = mkdtempSync(path.join(os.tmpdir(), 'storyboard-json-'));

describe('json-file', () => {
	it('пишет и читает JSON', () => {
		const file = path.join(directory, 'prompts.json');
		writeJsonFile(file, { plank: 'STORYBOARD' });
		expect(readJsonFile(file)).toEqual({ plank: 'STORYBOARD' });
	});

	it('читает массив и отвергает не массив', () => {
		const array = path.join(directory, 'items.json');
		const object = path.join(directory, 'object.json');
		writeFileSync(array, '[1, 2]', 'utf8');
		writeFileSync(object, '{}', 'utf8');
		expect(readJsonArray(array)).toEqual([1, 2]);
		expect(() => readJsonArray(object)).toThrow('ожидается массив JSON');
	});
});
