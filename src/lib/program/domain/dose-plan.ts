import { DOSE_UNIT, parseDose } from '../../shared/dose.ts';

const NUMBER = /\d+/g;
const HOLD_LEADS = /^\d+\s*с\s*×/;
const SETS_LEAD = /^\d+\s*×/;
const SINGLE_SET = 1;
const NO_HOLD = 0;
const LAST = -1;
const FIRST = 0;

export const holdSecondsOfDose = (text: string): number => {
	if (parseDose(text).unit !== DOSE_UNIT.seconds) return NO_HOLD;
	const numbers = numbersOf(text);
	return Number(numbers.at(SETS_LEAD.test(text) ? LAST : FIRST));
};

export const setsOfDose = (text: string): number => {
	const numbers = numbersOf(text);
	if (HOLD_LEADS.test(text)) return Number(numbers.at(LAST));
	return SETS_LEAD.test(text) ? Number(numbers.at(FIRST)) : SINGLE_SET;
};

const numbersOf = (text: string): readonly number[] =>
	text
		.matchAll(NUMBER)
		.map((match) => Number(match[0]))
		.toArray();
