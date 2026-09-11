import { describe, expect, it } from 'vitest';

import { REPOSITORIES } from '../../../test/program-fixtures.ts';
import { listPrograms } from './list-programs.ts';

describe('listPrograms', () => {
	it('перечисляет программы пользователя', () => {
		expect(listPrograms(REPOSITORIES, 'user-1').map((view) => view.id)).toEqual(['program-1']);
		expect(listPrograms(REPOSITORIES, 'user-2')).toEqual([]);
	});
});
