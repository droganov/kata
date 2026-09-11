import { describe, expect, it } from 'vitest';

import { REPOSITORIES } from '../../../test/program-fixtures.ts';
import { findProgram } from './find-program.ts';

describe('findProgram', () => {
	it('отдаёт представление программы или ничего', () => {
		expect(findProgram(REPOSITORIES, 'program-1')?.sections).toEqual([
			{ mode: 'loaded', slotCount: 2, slug: 'strength', title: 'Силовой' }
		]);
		expect(findProgram(REPOSITORIES, 'нет')).toBeUndefined();
	});
});
