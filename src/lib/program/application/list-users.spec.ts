import { describe, expect, it } from 'vitest';

import { REPOSITORIES } from '../../../test/program-fixtures.ts';
import { listUsers } from './list-users.ts';

describe('listUsers', () => {
	it('перечисляет пользователей', () => {
		expect(listUsers(REPOSITORIES)).toEqual([
			{ id: 'user-1', name: 'Сергей', programs: ['program-1'] },
			{ id: 'user-2', name: 'Гость', programs: [] }
		]);
	});
});
