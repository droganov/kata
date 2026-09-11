import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';

import { createJsonProgramRepository } from './json-program-repository.ts';

const directory = mkdtempSync(path.join(tmpdir(), 'program-data-'));
const programsFile = path.join(directory, 'programs.json');
writeFileSync(programsFile, JSON.stringify([{ id: 'p1', title: 'Программа' }]), 'utf8');

describe('createJsonProgramRepository', () => {
	it('читает программы и проверяет каждую по схеме', () => {
		const assertValid = vi.fn();
		const programs = createJsonProgramRepository({
			file: programsFile,
			validator: { assertValid }
		});
		expect(programs.readAll().map((program) => program.id)).toEqual(['p1']);
		expect(assertValid.mock.calls[0]?.[0]).toBe('program.schema.json');
		expect(assertValid.mock.calls[0]?.[2]).toBe(`${programsFile}#0`);
	});

	it('поднимает ошибку схемы наружу', () => {
		const assertValid = vi.fn(() => {
			throw new Error('схема нарушена');
		});
		const programs = createJsonProgramRepository({
			file: programsFile,
			validator: { assertValid }
		});
		expect(() => programs.readAll()).toThrow('схема нарушена');
	});
});
