import type { Bank } from '../bank.ts';
import type { Catalog } from '../catalog.ts';
import type { Finding } from '../finding.ts';

import { bankRecords, EXERCISE_MODE } from '../bank.ts';
import { EQUIPMENT_KIND } from '../equipment.ts';
import { exerciseSubject, ruleCheck } from '../finding.ts';
import { hasSpineFlag, LIST_SEPARATOR, mainEquipmentOf, matchedPatterns } from './rule-helpers.ts';

const RULE_DOSE = 'R5 DOSE';
const RULE_MODE = 'R6 MODE';
const RULE_SPINE = 'R7 SPINE';
const RULE_GEAR = 'R8 GEAR';
const RULE_NOTE = 'R10 NOTE';
const STRETCH_DOSE = /^\d+×\d+с(?:\/сторона)?$/;
const SPINE_PATTERNS = [
	'наклон вперёд стоя',
	'к ногам стоя',
	'складк',
	'плуг',
	'кобра',
	'верблюд',
	'мостик',
	'скручивания сидя'
];
const MIN_NOTE_LENGTH = 40;
const EMPTY_NOTE = '';
const NO_MAIN_GEAR = 'нет';

export const stretchBodyOnly = (bank: Bank, catalog: Catalog): Finding[] =>
	bankRecords(bank).flatMap(({ exercise }) => {
		const main = mainEquipmentOf(catalog, exercise);
		return ruleCheck(
			main?.kind === EQUIPMENT_KIND.body,
			RULE_GEAR,
			exerciseSubject(bank, exercise),
			`${exercise.name}: главное средство ${main?.slug ?? NO_MAIN_GEAR}`
		);
	});

export const stretchDoseFormat = (bank: Bank): Finding[] =>
	bankRecords(bank)
		.filter(({ exercise }) => !STRETCH_DOSE.test(exercise.dose))
		.map(({ exercise }) => ({
			message: `${exercise.name}: доза ${exercise.dose}`,
			rule: RULE_DOSE,
			subject: exerciseSubject(bank, exercise)
		}));

export const stretchHowToNote = (bank: Bank): Finding[] =>
	bankRecords(bank)
		.filter(({ exercise }) => (exercise.note ?? EMPTY_NOTE).length < MIN_NOTE_LENGTH)
		.map(({ exercise }) => ({
			message: `${exercise.name}: нет заметки как делать`,
			rule: RULE_NOTE,
			subject: exerciseSubject(bank, exercise)
		}));

export const stretchSpineSafety = (bank: Bank): Finding[] =>
	bankRecords(bank).flatMap(({ exercise }) => {
		const matched = matchedPatterns(exercise.name, SPINE_PATTERNS);
		const subject = exerciseSubject(bank, exercise);
		return [
			...ruleCheck(
				!hasSpineFlag(exercise.constraints),
				RULE_SPINE,
				subject,
				`${exercise.name}: флаг спины`
			),
			...ruleCheck(
				matched.length === 0,
				RULE_SPINE,
				subject,
				`${exercise.name}: запрещённый паттерн ${matched.join(LIST_SEPARATOR)}`
			)
		];
	});

export const stretchStaticMode = (bank: Bank): Finding[] =>
	bankRecords(bank)
		.filter(({ exercise }) => exercise.mode !== EXERCISE_MODE.static_stretch)
		.map(({ exercise }) => ({
			message: `${exercise.name}: mode=${exercise.mode}`,
			rule: RULE_MODE,
			subject: exerciseSubject(bank, exercise)
		}));
