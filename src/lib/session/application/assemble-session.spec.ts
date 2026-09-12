import { describe, expect, it } from 'vitest';

import { GATEWAYS } from '../../../test/session-fixtures.ts';
import { assembleSession } from './assemble-session.ts';

describe('assembleSession', () => {
	it('собирает Занятие выбранной Программы с процедурами его Упражнений', () => {
		const view = assembleSession(GATEWAYS, 'program-1');
		expect(view.title).toBe('Закрепления и добор');
		expect(view.blocks.map((block) => block.name)).toEqual(['Разогрев', 'Разминка', 'Силовой']);
		expect(view.blocks[1]?.items[0]?.detail.steps[0]?.title).toBe('Наклон');
	});

	it('бросает, когда Программы нет', () => {
		expect(() => assembleSession(GATEWAYS, 'missing')).toThrow('missing');
	});
});
