import { describe, expect, it } from 'vitest';

import type { WriteReport } from '../application/write-tables.ts';

import { writeLines } from './convert-view.ts';

describe('writeLines', () => {
	it('печатает записанные таблицы и общий счёт строк', () => {
		const report: WriteReport = { files: [{ name: 'target', rowCount: 118 }], rowCount: 118 };
		expect(writeLines(report)).toEqual(['ТАБЛИЦА target  СТРОК: 118', 'ЗАПИСАНО СТРОК: 118']);
	});
});
