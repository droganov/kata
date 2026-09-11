import { describe, expect, it } from 'vitest';

import { REPOSITORIES } from '../../../test/program-fixtures.ts';
import { outlineProgram } from './outline-program.ts';

describe('outlineProgram', () => {
	it('строит план секций с контурами банка', () => {
		const outline = outlineProgram(REPOSITORIES, 'program-1');
		expect([outline.id, outline.title]).toEqual(['program-1', 'Программа']);
		expect(outline.sections[0]?.baseExerciseIds).toEqual(['a']);
		expect(outline.sections[0]?.groups).toEqual([
			{
				id: 'pool',
				slots: [
					{
						allowRepeat: false,
						contourTitle: 'колено',
						exerciseIds: ['b', 'c'],
						id: 'pool',
						label: 'Пул',
						pick: 1
					}
				],
				zone: { id: 'zone-1', title: 'Бёдра' }
			}
		]);
	});
});
