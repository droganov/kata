import type { ExerciseReport } from '../application/validate-exercises.ts';

const FAIL_MARK = '  FAIL  ';
const FIELD_GAP = '  ';
const RULE_GAP = ': ';
const RECORDS_LABEL = 'ЗАПИСЕЙ: ';
const VERDICTS_LABEL = 'ВЕРДИКТОВ: ';
const TOTAL_LABEL = 'ПРОВАЛЕНО: ';
const RULE_INDENT = '  ';

export const criticExitCode = (report: ExerciseReport): number => (report.failureCount > 0 ? 1 : 0);

export const criticLines = (report: ExerciseReport): readonly string[] => [
	`${RECORDS_LABEL}${String(report.recordCount)}${FIELD_GAP}${VERDICTS_LABEL}${String(report.verdictCount)}`,
	...report.findings.map(
		(finding) =>
			`${FAIL_MARK}${finding.rule}${FIELD_GAP}${finding.subject}${FIELD_GAP}${finding.message}`
	),
	...ruleCountLines(report),
	`${TOTAL_LABEL}${String(report.failureCount)}`
];

const ruleCountLines = (report: ExerciseReport): readonly string[] => {
	const counts = new Map<string, number>();
	for (const finding of report.findings)
		counts.set(finding.rule, (counts.get(finding.rule) ?? 0) + 1);
	return [...counts]
		.toSorted(([first], [second]) => first.localeCompare(second))
		.map(([rule, count]) => `${RULE_INDENT}${rule}${RULE_GAP}${String(count)}`);
};
