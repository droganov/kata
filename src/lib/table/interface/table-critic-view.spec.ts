import { describe, expect, it } from 'vitest';

import type { TableReport } from '../application/validate-tables.ts';

import { criticExitCode, criticLines } from './table-critic-view.ts';

const clean: TableReport = {
	failureCount: 0,
	findings: [],
	tables: [{ name: 'muscle_group', rowCount: 10 }]
};
const broken: TableReport = {
	failureCount: 1,
	findings: [{ message: 'групп мышц 9', rule: 'C1 GROUPS', subject: 'muscle_group' }],
	tables: [{ name: 'muscle_group', rowCount: 9 }]
};

describe('criticLines', () => {
	it('печатает сводку по таблицам и итог', () => {
		expect(criticLines(clean)).toEqual(['ТАБЛИЦА muscle_group  СТРОК: 10', 'ПРОВАЛЕНО: 0']);
	});

	it('печатает строку провала', () => {
		expect(criticLines(broken)[1]).toBe('  FAIL  C1 GROUPS  muscle_group  групп мышц 9');
	});
});

describe('criticExitCode', () => {
	it('ноль без провалов, единица при провалах', () => {
		expect(criticExitCode(clean)).toBe(0);
		expect(criticExitCode(broken)).toBe(1);
	});
});
