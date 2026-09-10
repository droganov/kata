import type { Bank } from '../bank.ts';
import type { Catalog } from '../catalog.ts';
import type { Finding } from '../finding.ts';

import { bankRecords, EXERCISE_MODE } from '../bank.ts';
import { equipmentOf } from '../catalog.ts';
import { EQUIPMENT_KIND } from '../equipment.ts';
import { exerciseSubject, ruleCheck } from '../finding.ts';
import { hasSpineFlag, LIST_SEPARATOR, matchedPatterns } from './rule-helpers.ts';

const RULE_DOSE = 'R5 DOSE';
const RULE_MODE = 'R6 MODE';
const RULE_SPINE = 'R7 SPINE';
const RULE_WEIGHT = 'R8 WEIGHT';
const STRENGTH_DOSE = /^\d+×\d+(?:–\d+)?(?: м| шагов)?(?:\/сторона)?$/;
const ERECTORS_CONTOUR = 'erectors';
const MAX_FREE_WEIGHT_KG = 10;
const UNKNOWN_KG = 99;
const SPINE_PATTERNS = [
	'становая',
	'в наклоне',
	'скручиван',
	'гуд-морнинг',
	'гакк',
	'присед со штангой',
	'стоя над головой',
	'дровосек',
	'ролик',
	'переразгиб'
];
const NEUTRAL_PATTERNS = ['до нейтрали', 'нейтральн', 'не прогибается'];
const NOTE_SEPARATOR = ' ';
const EMPTY_NOTE = '';

export function strengthDoseFormat(bank: Bank): Finding[] {
	return bankRecords(bank)
		.filter(({ exercise }) => !STRENGTH_DOSE.test(exercise.dose))
		.map(({ exercise }) => ({
			message: `${exercise.name}: доза ${exercise.dose}`,
			rule: RULE_DOSE,
			subject: exerciseSubject(bank, exercise)
		}));
}

export function strengthLoadedMode(bank: Bank): Finding[] {
	return bankRecords(bank)
		.filter(({ exercise }) => exercise.mode !== EXERCISE_MODE.loaded)
		.map(({ exercise }) => ({
			message: `${exercise.name}: mode=${exercise.mode}`,
			rule: RULE_MODE,
			subject: exerciseSubject(bank, exercise)
		}));
}

export function strengthSpineSafety(bank: Bank): Finding[] {
	return bankRecords(bank).flatMap(({ contour, exercise }) => {
		const matched = matchedPatterns(exercise.name, SPINE_PATTERNS);
		const text = `${exercise.name}${NOTE_SEPARATOR}${exercise.note ?? EMPTY_NOTE}`;
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
			),
			...ruleCheck(
				!contour.slug.startsWith(ERECTORS_CONTOUR) ||
					matchedPatterns(text, NEUTRAL_PATTERNS).length > 0,
				RULE_SPINE,
				subject,
				`${exercise.name}: контур разгибателей требует амплитуду до нейтрали в имени или заметке`
			)
		];
	});
}

export function strengthWeightLimit(bank: Bank, catalog: Catalog): Finding[] {
	return bankRecords(bank).flatMap(({ exercise }) => {
		const { constraints } = exercise;
		const kinds = exercise.equipment.map(
			(reference) => equipmentOf(catalog, reference.id)?.kind
		);
		const hasFreeWeightGear = kinds.includes(EQUIPMENT_KIND.free_weight);
		const subject = exerciseSubject(bank, exercise);
		return [
			...ruleCheck(
				!constraints.free_weight ||
					(constraints.kg_max ?? UNKNOWN_KG) <= MAX_FREE_WEIGHT_KG,
				RULE_WEIGHT,
				subject,
				`${exercise.name}: свободный вес больше ${String(MAX_FREE_WEIGHT_KG)} кг`
			),
			...ruleCheck(
				constraints.free_weight === hasFreeWeightGear,
				RULE_WEIGHT,
				subject,
				`${exercise.name}: средства ${kinds.join(LIST_SEPARATOR)}, free_weight=${String(constraints.free_weight)}`
			)
		];
	});
}
