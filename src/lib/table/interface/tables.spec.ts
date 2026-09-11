import { describe, expect, it } from 'vitest';

import { createTables } from './tables.ts';

const MUSCLE_GROUP_COUNT = 10;

describe('createTables на боевых данных', () => {
	it('критик не находит нарушений в записанных таблицах', () => {
		const report = createTables().validateTables();
		expect(report.findings).toEqual([]);
		expect(report.failureCount).toBe(0);
	});

	it('докладывает десять групп мышц и все упражнения четырёх каталогов', () => {
		const report = createTables().validateTables();
		const rowsOfTable = (name: string): number | undefined =>
			report.tables.find((table) => table.name === name)?.rowCount;
		expect(rowsOfTable('muscle_group')).toBe(MUSCLE_GROUP_COUNT);
		expect(rowsOfTable('exercise')).toBe(rowsOfTable('exercise_source'));
	});
});
