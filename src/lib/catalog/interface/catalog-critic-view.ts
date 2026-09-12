import type { CatalogReport } from '../application/validate-catalog.ts';

const FAIL_MARK = '  FAIL  ';
const FIELD_GAP = '  ';
const TOTAL_LABEL = 'ПРОВАЛЕНО: ';
const BANK_LABEL = 'БАНК ';
const RECORDS_LABEL = 'ЗАПИСЕЙ: ';
const FAILURES_LABEL = 'ПРОВАЛОВ: ';

export const criticExitCode = (report: CatalogReport): number => (report.failureCount > 0 ? 1 : 0);

export const criticLines = (report: CatalogReport): string[] => [
	...report.banks.map(
		(bank) =>
			`${BANK_LABEL}${bank.slug}${FIELD_GAP}${RECORDS_LABEL}${String(bank.exerciseCount)}${FIELD_GAP}${FAILURES_LABEL}${String(bank.findings.length)}`
	),
	...report.banks.flatMap((bank) =>
		bank.findings.map(
			(finding) =>
				`${FAIL_MARK}${finding.rule}${FIELD_GAP}${finding.subject}${FIELD_GAP}${finding.message}`
		)
	),
	`${TOTAL_LABEL}${String(report.failureCount)}`
];
