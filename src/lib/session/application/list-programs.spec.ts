import { describe, expect, it } from 'vitest';

import { GATEWAYS, PROGRAM } from '../../../test/session-fixtures.ts';
import { listPrograms } from './list-programs.ts';

describe('listPrograms', () => {
	it('перечисляет Программы по названию', () => {
		const other = { ...PROGRAM, id: 'program-0', title: 'Анатомия' };
		const cards = listPrograms({
			...GATEWAYS,
			programs: { readPrograms: () => [PROGRAM, other] }
		});
		expect(cards).toEqual([
			{ id: 'program-0', title: 'Анатомия' },
			{ id: 'program-1', title: 'Закрепления и добор' }
		]);
	});
});
