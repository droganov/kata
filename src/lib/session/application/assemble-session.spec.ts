import { describe, expect, it } from 'vitest';

import { CATALOG, PROGRAM } from '../../../test/session-fixtures.ts';
import { assembleSession } from './assemble-session.ts';

const GATEWAYS = {
	catalog: { readCatalog: () => CATALOG },
	programs: { readPrograms: () => [PROGRAM] }
};

describe('assembleSession', () => {
	it('собирает Занятие выбранной Программы', () => {
		const view = assembleSession(GATEWAYS, 'program-1');
		expect(view.title).toBe('Закрепления и добор');
		expect(view.blocks.map((block) => block.name)).toEqual(['Разогрев', 'Разминка', 'Силовой']);
	});

	it('бросает, когда Программы нет', () => {
		expect(() => assembleSession(GATEWAYS, 'missing')).toThrow('missing');
	});
});
