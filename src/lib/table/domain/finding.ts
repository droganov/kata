const LINE_MARK = ':';
const FIRST_LINE = 1;

export const LIST_SEPARATOR = ', ';

export interface Finding {
	readonly message: string;
	readonly rule: string;
	readonly subject: string;
}

export function lineSubject(table: string, at: number): string {
	return `${table}${LINE_MARK}${String(at + FIRST_LINE)}`;
}

export function ruleCheck(
	isPassing: boolean,
	rule: string,
	subject: string,
	message: string
): Finding[] {
	return isPassing ? [] : [{ message, rule, subject }];
}

export function slugSubject(table: string, slug: string): string {
	return `${table}${LINE_MARK} ${slug}`;
}
