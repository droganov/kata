import type { WriteReport } from '../application/write-tables.ts';

const TABLE_LABEL = 'ТАБЛИЦА ';
const FIELD_GAP = '  ';
const ROWS_LABEL = 'СТРОК: ';
const WRITTEN_LABEL = 'ЗАПИСАНО СТРОК: ';

export const writeLines = (report: WriteReport): string[] => [
	...report.files.map(
		(file) => `${TABLE_LABEL}${file.name}${FIELD_GAP}${ROWS_LABEL}${String(file.rowCount)}`
	),
	`${WRITTEN_LABEL}${String(report.rowCount)}`
];
