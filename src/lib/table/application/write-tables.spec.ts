import { describe, expect, it } from 'vitest';

import type { Tables } from '../domain/table.ts';

import { sourceCatalog } from '../../../test/table-fixtures.ts';
import { writeTables } from './write-tables.ts';

describe('writeTables', () => {
	it('конвертирует источники и отдаёт пересчёт строк по таблицам', () => {
		const written: Tables[] = [];
		const report = writeTables({
			catalog: { readSourceCatalog: () => sourceCatalog() },
			tables: {
				readAll: () => ({ files: [] }),
				writeAll: (tables) => {
					written.push(tables);
				}
			}
		});
		expect(written).toHaveLength(1);
		expect(report.files.map((file) => file.name)).toEqual([
			'muscle_group',
			'target',
			'equipment',
			'exercise',
			'exercise_target',
			'exercise_equipment',
			'exercise_source',
			'step',
			'step_target',
			'oracle',
			'oracle_line',
			'verdict',
			'program',
			'block',
			'block_pin_group',
			'block_pin_target',
			'block_draw'
		]);
		expect(report.rowCount).toBe(
			report.files.reduce((total, file) => total + file.rowCount, 0)
		);
		expect(report.files.find((file) => file.name === 'exercise')?.rowCount).toBe(4);
	});
});
