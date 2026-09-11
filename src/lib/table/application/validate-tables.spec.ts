import { describe, expect, it } from 'vitest';

import { sourceCatalog, tableSetOf } from '../../../test/table-fixtures.ts';
import { tablesOf } from '../domain/convert.ts';
import { tableNames } from '../domain/table.ts';
import { validateTables } from './validate-tables.ts';

const tables = tablesOf(sourceCatalog());
const noWrite = (): void => {
	return;
};

describe('validateTables', () => {
	it('считает строки по таблицам и собирает находки всех правил', () => {
		const set = tableSetOf(
			Object.fromEntries(tableNames().map((name) => [name, tables[name]]))
		);
		const report = validateTables({
			catalog: { readSourceCatalog: () => sourceCatalog() },
			tables: { readAll: () => set, writeAll: noWrite }
		});
		expect(report.tables.find((table) => table.name === 'exercise')?.rowCount).toBe(4);
		expect(report.failureCount).toBe(report.findings.length);
		expect(report.findings.some((finding) => finding.rule.startsWith('C1'))).toBe(true);
	});

	it('на пустом наборе докладывает нули по строкам', () => {
		const report = validateTables({
			catalog: { readSourceCatalog: () => sourceCatalog() },
			tables: { readAll: () => tableSetOf({}), writeAll: noWrite }
		});
		expect(report.tables.every((table) => table.rowCount === 0)).toBe(true);
		expect(report.failureCount).toBeGreaterThan(0);
	});
});
