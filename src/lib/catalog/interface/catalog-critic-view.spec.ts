import { describe, expect, it } from 'vitest';

import type { CatalogReport } from '../application/validate-catalog.ts';

import { criticExitCode, criticLines } from './catalog-critic-view.ts';

const clean: CatalogReport = {
	banks: [{ exerciseCount: 12, findings: [], slug: 'cardio', title: 'Кардио' }],
	failureCount: 0
};
const broken: CatalogReport = {
	banks: [
		{
			exerciseCount: 84,
			findings: [{ message: 'доза 40с × 2', rule: 'R5 DOSE', subject: 'stretch:st_calf' }],
			slug: 'stretch',
			title: 'Растяжка'
		}
	],
	failureCount: 1
};

describe('criticLines', () => {
	it('печатает сводку и итог без провалов', () => {
		expect(criticLines(clean)).toEqual([
			'БАНК cardio  ЗАПИСЕЙ: 12  ПРОВАЛОВ: 0',
			'ПРОВАЛЕНО: 0'
		]);
	});

	it('печатает строку провала', () => {
		expect(criticLines(broken)[1]).toBe('  FAIL  R5 DOSE  stretch:st_calf  доза 40с × 2');
	});
});

describe('criticExitCode', () => {
	it('ноль без провалов', () => {
		expect(criticExitCode(clean)).toBe(0);
	});

	it('единица при провалах', () => {
		expect(criticExitCode(broken)).toBe(1);
	});
});
