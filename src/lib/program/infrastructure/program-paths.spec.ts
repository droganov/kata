import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { PROGRAM_PATHS } from './program-paths.ts';

describe('PROGRAM_PATHS', () => {
	it('указывает на данные и схемы проекта', () => {
		expect(PROGRAM_PATHS.banks.endsWith('data/banks')).toBe(true);
		expect(PROGRAM_PATHS.programs.endsWith('data/programs.json')).toBe(true);
		expect(PROGRAM_PATHS.targets.endsWith('data/targets.json')).toBe(true);
		expect(PROGRAM_PATHS.users.endsWith('data/users.json')).toBe(true);
		expect(PROGRAM_PATHS.schema.endsWith('schema')).toBe(true);
	});

	it('пути существуют', () => {
		expect(existsSync(PROGRAM_PATHS.programs)).toBe(true);
		expect(existsSync(PROGRAM_PATHS.users)).toBe(true);
	});
});
