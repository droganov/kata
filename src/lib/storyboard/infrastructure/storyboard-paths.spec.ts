import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { STORYBOARD_PATHS } from './storyboard-paths.ts';

describe('STORYBOARD_PATHS', () => {
	it('указывает на данные и схемы проекта', () => {
		expect(path.basename(STORYBOARD_PATHS.banks)).toBe('banks');
		expect(path.basename(STORYBOARD_PATHS.equipment)).toBe('equipment.json');
		expect(path.basename(STORYBOARD_PATHS.targets)).toBe('targets.json');
		expect(path.basename(STORYBOARD_PATHS.schema)).toBe('schema');
		expect(path.isAbsolute(STORYBOARD_PATHS.banks)).toBe(true);
	});
});
