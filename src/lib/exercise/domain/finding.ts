export interface Finding {
	readonly message: string;
	readonly rule: string;
	readonly subject: string;
}

export interface Issue {
	readonly message: string;
	readonly rule: string;
}

export function findingsOf(subject: string, issues: readonly Issue[]): readonly Finding[] {
	return issues.map((issue) => ({ message: issue.message, rule: issue.rule, subject }));
}

export function issueCheck(isPassing: boolean, rule: string, message: string): readonly Issue[] {
	return isPassing ? [] : [{ message, rule }];
}
