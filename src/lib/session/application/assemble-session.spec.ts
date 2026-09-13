import { describe, expect, it } from 'vitest';

import { GATEWAYS } from '../../../test/session-fixtures.ts';
import { assembleSession } from './assemble-session.ts';

const SEED = 7;

describe('assembleSession', () => {
	it('собирает Занятие выбранной Программы с процедурами его Упражнений', () => {
		const view = assembleSession(GATEWAYS, 'program-1', SEED);
		expect(view.title).toBe('Закрепления и добор');
		expect(view.blocks.map((block) => block.name)).toEqual([
			'Разогрев',
			'Разминка',
			'Силовой',
			'Растяжка'
		]);
		const neckRoll = view.blocks[1]?.items.find((item) => item.name === 'Круги головой');
		expect(neckRoll?.detail.steps[0]?.title).toBe('Наклон');
	});

	it('на одинаковом зерне собирает одинаковое Занятие', () => {
		expect(assembleSession(GATEWAYS, 'program-1', SEED)).toEqual(
			assembleSession(GATEWAYS, 'program-1', SEED)
		);
	});

	it('отдаёт зерно вместе с Занятием', () => {
		expect(assembleSession(GATEWAYS, 'program-1', SEED).seed).toBe(SEED);
	});

	it('бросает, когда Программы нет', () => {
		expect(() => assembleSession(GATEWAYS, 'missing', SEED)).toThrow('missing');
	});
});
