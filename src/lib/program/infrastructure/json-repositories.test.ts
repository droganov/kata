import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';

import { createJsonProgramRepository } from './json-program-repository.ts';
import { createJsonUserRepository } from './json-user-repository.ts';

const directory = mkdtempSync(path.join(tmpdir(), 'program-data-'));
const programsFile = path.join(directory, 'programs.json');
const usersFile = path.join(directory, 'users.json');
writeFileSync(programsFile, JSON.stringify([{ id: 'p1', title: 'Программа' }]), 'utf8');
writeFileSync(usersFile, JSON.stringify([{ id: 'u1', name: 'Сергей', programs: ['p1'] }]), 'utf8');

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

describe('createJsonUserRepository', () => {
	it('читает пользователей и проверяет каждого по схеме', () => {
		const assertValid = vi.fn();
		const users = createJsonUserRepository({ file: usersFile, validator: { assertValid } });
		expect(users.readAll().map((user) => user.name)).toEqual(['Сергей']);
		expect(assertValid.mock.calls[0]?.[0]).toBe('user.schema.json');
	});

	it('поднимает ошибку схемы наружу', () => {
		const assertValid = vi.fn(() => {
			throw new Error('схема нарушена');
		});
		const users = createJsonUserRepository({ file: usersFile, validator: { assertValid } });
		expect(() => users.readAll()).toThrow('схема нарушена');
	});
});
