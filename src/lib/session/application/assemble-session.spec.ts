import { describe, expect, it } from 'vitest';

import type { Performed } from './store.ts';

import { GATEWAYS } from '../../../test/session-fixtures.ts';
import { assembleSession } from './assemble-session.ts';

const SEED = 7;
const SEEDS = Array.from({ length: 500 }, (_item, at) => at);
const NOW = new Date('2026-09-26T09:00:00Z');
const NO_HISTORY: readonly Performed[] = [];

const shareOf = (performed: readonly Performed[]): number =>
	SEEDS.filter((seed) =>
		assembleSession(GATEWAYS, 'program-1', seed, performed, NOW)
			.blocks.flatMap((block) => block.items)
			.some((item) => item.exercise === 'ex-press')
	).length / SEEDS.length;

describe('assembleSession', () => {
	it('собирает Занятие выбранной Программы с процедурами его Упражнений', () => {
		const view = assembleSession(GATEWAYS, 'program-1', SEED, NO_HISTORY, NOW);
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
		expect(assembleSession(GATEWAYS, 'program-1', SEED, NO_HISTORY, NOW)).toEqual(
			assembleSession(GATEWAYS, 'program-1', SEED, NO_HISTORY, NOW)
		);
	});

	it('отдаёт зерно вместе с Занятием', () => {
		expect(assembleSession(GATEWAYS, 'program-1', SEED, NO_HISTORY, NOW).seed).toBe(SEED);
	});

	it('подаёт Историю на вход сборке: выполненное вчера выпадает реже', () => {
		const history = [{ doneAt: '2026-09-25T09:00:00Z', exercise: 'ex-press' }];
		expect(shareOf(NO_HISTORY)).toBeGreaterThan(0.4);
		expect(shareOf(history)).toBeLessThan(0.1);
	});

	it('бросает, когда Программы нет', () => {
		expect(() => assembleSession(GATEWAYS, 'missing', SEED, NO_HISTORY, NOW)).toThrow(
			'missing'
		);
	});
});
