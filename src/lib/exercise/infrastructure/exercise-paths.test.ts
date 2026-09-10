import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { EXERCISE_PATHS } from './exercise-paths.ts';

describe('EXERCISE_PATHS', () => {
	it('указывает на боевые данные и схемы', () => {
		expect(Object.values(EXERCISE_PATHS).every((item) => existsSync(item))).toBe(true);
	});
});
