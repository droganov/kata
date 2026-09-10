import type { SessionView } from '../application/program-views.ts';
import type { ProgramReport } from '../application/validate-program.ts';

const PROGRAM_LABEL = 'ПРОГРАММА ';
const SESSION_LABEL = 'ЗАНЯТИЕ ';
const MINUTES_LABEL = ' мин';
const SECTION_INDENT = '  ';
const SLOT_INDENT = `${SECTION_INDENT}${SECTION_INDENT}`;
const FAIL_MARK = '  FAIL  ';
const FIELD_GAP = '  ';
const LIST_SEPARATOR = ', ';
const LABEL_SEPARATOR = ': ';
const TOTAL_LABEL = 'ПРОВАЛЕНО: ';
const OPEN = ' (';
const CLOSE = ')';

export function criticExitCode(reports: readonly ProgramReport[]): number {
	return failureCountOf(reports) > 0 ? 1 : 0;
}

export function criticLines(reports: readonly ProgramReport[]): readonly string[] {
	return [
		...reports.flatMap((report) => [
			`${PROGRAM_LABEL}${report.title}`,
			...report.sessions.flatMap((session) => sessionLines(session)),
			...report.findings.map(
				(finding) =>
					`${FAIL_MARK}${finding.rule}${FIELD_GAP}${finding.goal}${FIELD_GAP}${finding.subject}${FIELD_GAP}${finding.message}`
			)
		]),
		`${TOTAL_LABEL}${String(failureCountOf(reports))}`
	];
}

function failureCountOf(reports: readonly ProgramReport[]): number {
	return reports.reduce((total, report) => total + report.failureCount, 0);
}

function sessionLines(session: SessionView): readonly string[] {
	return [
		`${SESSION_LABEL}${String(session.index)}${OPEN}${session.slug}${LIST_SEPARATOR}${String(session.minutes)}${MINUTES_LABEL}${CLOSE}`,
		...session.sections.flatMap((section) => [
			`${SECTION_INDENT}${section.title}`,
			...section.slots.map(
				(slot) =>
					`${SLOT_INDENT}${slot.label}${LABEL_SEPARATOR}${slot.exercises.map((exercise) => exercise.slug).join(LIST_SEPARATOR)}`
			)
		])
	];
}
