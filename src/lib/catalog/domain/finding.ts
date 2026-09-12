import type { Bank, BankExercise, Contour, Zone } from './bank.ts';

const SUBJECT_SEPARATOR = ':';
const PATH_SEPARATOR = '/';

export interface Finding {
	readonly message: string;
	readonly rule: string;
	readonly subject: string;
}

export const bankSubject = (bank: Bank): string => bank.slug;

export const contourSubject = (bank: Bank, zone: Zone, contour: Contour): string =>
	`${bank.slug}${SUBJECT_SEPARATOR}${zone.slug}${PATH_SEPARATOR}${contour.slug}`;

export const exerciseSubject = (bank: Bank, exercise: BankExercise): string =>
	`${bank.slug}${SUBJECT_SEPARATOR}${exercise.slug}`;

export const ruleCheck = (
	isPassing: boolean,
	rule: string,
	subject: string,
	message: string
): Finding[] => (isPassing ? [] : [{ message, rule, subject }]);
