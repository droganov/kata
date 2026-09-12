export interface Finding {
	readonly message: string;
	readonly rule: string;
	readonly subject: string;
}

export interface Issue {
	readonly message: string;
	readonly rule: string;
}

export const findingsOf = (subject: string, issues: readonly Issue[]): readonly Finding[] =>
	issues.map((issue) => ({ message: issue.message, rule: issue.rule, subject }));

export const issueCheck = (isPassing: boolean, rule: string, message: string): readonly Issue[] =>
	isPassing ? [] : [{ message, rule }];
