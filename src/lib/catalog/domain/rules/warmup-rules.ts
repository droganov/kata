import type { Bank, Contour } from '../bank.ts';
import type { Finding } from '../finding.ts';

import { bankRecords, contoursOf } from '../bank.ts';
import { bankSubject, exerciseSubject, ruleCheck } from '../finding.ts';
import { LIST_SEPARATOR, matchedPatterns } from './rule-helpers.ts';

const RULE_DOSE = 'R5 DOSE';
const RULE_DYNAMIC = 'R6 DYNAMIC';
const RULE_SPINE = 'R7 SPINE';
const RULE_TIME = 'R8 TIME';
const RULE_NO_GEAR = 'R9 NO_GEAR';
const WARMUP_DOSE =
	/^(?:\d+|\d+\/сторона|по \d+ в каждую сторону(?:, каждая нога)?|\d+ с|\d+ шагов)$/;
const MAX_DYNAMIC_SECONDS = 60;
const SPINE_PATTERNS = [
	'наклон корпуса',
	'наклоны корпуса',
	'наклон туловища',
	'скручиван',
	'гиперэкстенз',
	'становая',
	'кошка'
];
const GEAR_PATTERNS = [
	'палк',
	'резинк',
	'стен',
	'проём',
	'опор',
	'гантел',
	'скамь',
	'валик',
	'ремн',
	'тренаж',
	'блок'
];

export const warmupBodyOnly = (bank: Bank): Finding[] =>
	bankRecords(bank).flatMap(({ exercise }) => {
		const matched = matchedPatterns(exercise.name, GEAR_PATTERNS);
		return ruleCheck(
			matched.length === 0,
			RULE_NO_GEAR,
			exerciseSubject(bank, exercise),
			`${exercise.name}: снаряд или опора ${matched.join(LIST_SEPARATOR)}`
		);
	});

export const warmupDoseFormat = (bank: Bank): Finding[] =>
	bankRecords(bank)
		.filter(({ exercise }) => !WARMUP_DOSE.test(exercise.dose))
		.map(({ exercise }) => ({
			message: `${exercise.name}: доза ${exercise.dose}`,
			rule: RULE_DOSE,
			subject: exerciseSubject(bank, exercise)
		}));

export const warmupDynamicOnly = (bank: Bank): Finding[] =>
	bankRecords(bank).flatMap(({ exercise }) => {
		const seconds = exercise.seconds ?? 0;
		return ruleCheck(
			seconds > 0 && seconds <= MAX_DYNAMIC_SECONDS,
			RULE_DYNAMIC,
			exerciseSubject(bank, exercise),
			`${exercise.name}: seconds=${String(seconds)}`
		);
	});

export const warmupSessionTime = (bank: Bank): Finding[] => {
	const budget = bank.session_budget_sec ?? 0;
	const total = contoursOf(bank).reduce((sum, { contour }) => sum + contourSeconds(contour), 0);
	return ruleCheck(
		total <= budget,
		RULE_TIME,
		bankSubject(bank),
		`${String(Math.round(total))} с при бюджете ${String(budget)} с`
	);
};

export const warmupSpineSafety = (bank: Bank): Finding[] =>
	bankRecords(bank).flatMap(({ exercise }) => {
		const matched = matchedPatterns(exercise.name, SPINE_PATTERNS);
		return ruleCheck(
			matched.length === 0,
			RULE_SPINE,
			exerciseSubject(bank, exercise),
			`${exercise.name}: запрещённый паттерн ${matched.join(LIST_SEPARATOR)}`
		);
	});

const contourSeconds = (contour: Contour): number => {
	const total = contour.exercises.reduce((sum, exercise) => sum + (exercise.seconds ?? 0), 0);
	return ((contour.pick ?? 0) * total) / contour.exercises.length;
};
