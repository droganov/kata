const LINE_MARK = ':';
const FIRST_LINE = 1;

export const LIST_SEPARATOR = ', ';

export interface Finding {
	readonly message: string;
	readonly rule: string;
	readonly subject: string;
}

export const lineSubject = (table: string, at: number): string =>
	`${table}${LINE_MARK}${String(at + FIRST_LINE)}`;

export const ruleCheck = (
	isPassing: boolean,
	rule: string,
	subject: string,
	message: string
): Finding[] => (isPassing ? [] : [{ message, rule, subject }]);

export const slugSubject = (table: string, slug: string): string => `${table}${LINE_MARK} ${slug}`;
