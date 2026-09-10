import type { Bank, BankExercise, Contour, Zone } from './bank.ts';

const SUBJECT_SEPARATOR = ':';
const PATH_SEPARATOR = '/';

export interface Finding {
	readonly message: string;
	readonly rule: string;
	readonly subject: string;
}

export function bankSubject(bank: Bank): string {
	return bank.slug;
}

export function contourSubject(bank: Bank, zone: Zone, contour: Contour): string {
	return `${bank.slug}${SUBJECT_SEPARATOR}${zone.slug}${PATH_SEPARATOR}${contour.slug}`;
}

export function exerciseSubject(bank: Bank, exercise: BankExercise): string {
	return `${bank.slug}${SUBJECT_SEPARATOR}${exercise.slug}`;
}

export function ruleCheck(
	isPassing: boolean,
	rule: string,
	subject: string,
	message: string
): Finding[] {
	return isPassing ? [] : [{ message, rule, subject }];
}
