import { describe, expect, it } from 'vitest';

import { GATEWAYS } from '../../../test/session-fixtures.ts';
import { findProgram } from './find-program.ts';

describe('findProgram', () => {
	it('отдаёт карточку Программы', () => {
		expect(findProgram(GATEWAYS, 'program-1')).toEqual({
			id: 'program-1',
			title: 'Закрепления и добор'
		});
	});

	it('бросает, когда Программы нет', () => {
		expect(() => findProgram(GATEWAYS, 'missing')).toThrow('missing');
	});
});
