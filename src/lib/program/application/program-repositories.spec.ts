import { describe, expect, it } from 'vitest';

import { REPOSITORIES } from '../../../test/program-fixtures.ts';
import { programOf } from './program-repositories.ts';

describe('programOf', () => {
	it('находит программу и ругается на неизвестный номер', () => {
		expect(programOf(REPOSITORIES, 'program-1').title).toBe('Программа');
		expect(() => programOf(REPOSITORIES, 'нет')).toThrow('нет программы нет');
	});
});
