import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';

import { createJsonSourceRepository } from './json-source-repository.ts';

const directory = mkdtempSync(path.join(tmpdir(), 'exercise-sources-'));
const file = path.join(directory, 'sources.json');
const source = { exercise: 'e1', id: 's1', title: 'NASM' };
writeFileSync(file, JSON.stringify([source]), 'utf8');

describe('createJsonSourceRepository', () => {
	it('читает источники и проверяет каждый по схеме', () => {
		const assertValid = vi.fn();
		const repository = createJsonSourceRepository({ file, validator: { assertValid } });
		expect(repository.readAll()).toEqual([source]);
		expect(assertValid.mock.calls[0]?.[0]).toBe('source.schema.json');
		expect(assertValid.mock.calls[0]?.[2]).toBe(`${file}#0`);
	});

	it('поднимает ошибку схемы наружу', () => {
		const assertValid = vi.fn(() => {
			throw new Error('схема нарушена');
		});
		const repository = createJsonSourceRepository({ file, validator: { assertValid } });
		expect(() => repository.readAll()).toThrow('схема нарушена');
	});
});
