import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { CATALOG_PATHS } from './catalog-paths.ts';

describe('CATALOG_PATHS', () => {
	it('указывает на данные и схемы проекта', () => {
		expect(CATALOG_PATHS.banks.endsWith('data/banks')).toBe(true);
		expect(CATALOG_PATHS.equipment.endsWith('data/equipment.json')).toBe(true);
		expect(CATALOG_PATHS.targets.endsWith('data/targets.json')).toBe(true);
		expect(CATALOG_PATHS.schema.endsWith('schema')).toBe(true);
	});

	it('пути существуют', () => {
		expect(existsSync(CATALOG_PATHS.banks)).toBe(true);
		expect(existsSync(CATALOG_PATHS.schema)).toBe(true);
	});
});
