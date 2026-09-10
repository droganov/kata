import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';

import type { Verdict } from '../domain/verdict.ts';

import { readJsonArray } from './json-file.ts';
import { createJsonVerdictRepository } from './json-verdict-repository.ts';

const directory = mkdtempSync(path.join(tmpdir(), 'exercise-verdicts-'));
const file = path.join(directory, 'verdicts.json');
const verdict = {
	hash: 'h1',
	id: 'v1',
	line: 'таз уходит',
	oracle: 'o1',
	verdict: 'independent'
} as unknown as Verdict;
writeFileSync(file, JSON.stringify([verdict]), 'utf8');

describe('createJsonVerdictRepository', () => {
	it('читает вердикты и проверяет каждый по схеме', () => {
		const assertValid = vi.fn();
		const repository = createJsonVerdictRepository({ file, validator: { assertValid } });
		expect(repository.readAll()).toEqual([verdict]);
		expect(assertValid.mock.calls[0]?.[0]).toBe('verdict.schema.json');
	});

	it('пишет вердикты, проверив их по схеме', () => {
		const assertValid = vi.fn();
		const target = path.join(directory, 'out.json');
		const repository = createJsonVerdictRepository({
			file: target,
			validator: { assertValid }
		});
		repository.save([verdict]);
		expect(readJsonArray(target)).toEqual([verdict]);
		expect(assertValid).toHaveBeenCalledTimes(1);
	});

	it('поднимает ошибку схемы наружу при чтении и записи', () => {
		const assertValid = vi.fn(() => {
			throw new Error('схема нарушена');
		});
		const repository = createJsonVerdictRepository({ file, validator: { assertValid } });
		expect(() => repository.readAll()).toThrow('схема нарушена');
		expect(() => {
			repository.save([verdict]);
		}).toThrow('схема нарушена');
	});
});
