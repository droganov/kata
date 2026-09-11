import type { TableReport } from '../application/validate-tables.ts';

const FAIL_MARK = '  FAIL  ';
const FIELD_GAP = '  ';
const TABLE_LABEL = 'ТАБЛИЦА ';
const ROWS_LABEL = 'СТРОК: ';
const TOTAL_LABEL = 'ПРОВАЛЕНО: ';

export function criticExitCode(report: TableReport): number {
	return report.failureCount > 0 ? 1 : 0;
}

export function criticLines(report: TableReport): string[] {
	return [
		...report.tables.map(
			(table) =>
				`${TABLE_LABEL}${table.name}${FIELD_GAP}${ROWS_LABEL}${String(table.rowCount)}`
		),
		...report.findings.map(
			(finding) =>
				`${FAIL_MARK}${finding.rule}${FIELD_GAP}${finding.subject}${FIELD_GAP}${finding.message}`
		),
		`${TOTAL_LABEL}${String(report.failureCount)}`
	];
}
