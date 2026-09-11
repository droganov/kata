import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { TABLE_PATHS } from './table-paths.ts';

describe('TABLE_PATHS', () => {
	it('указывает на существующие источники и каталог таблиц', () => {
		for (const path of Object.values(TABLE_PATHS)) expect(existsSync(path)).toBe(true);
	});
});
