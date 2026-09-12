import type { Bank, ExerciseMode } from '../bank.ts';
import type { Catalog } from '../catalog.ts';
import type { EquipmentKind } from '../equipment.ts';
import type { Finding } from '../finding.ts';

import { DOSE_UNIT, parseDose } from '../../../shared/dose.ts';
import { bankRecords, EXERCISE_MODE } from '../bank.ts';
import { EQUIPMENT_KIND } from '../equipment.ts';
import { exerciseSubject, ruleCheck } from '../finding.ts';
import { hasSpineFlag, LIST_SEPARATOR, mainEquipmentOf, matchedPatterns } from './rule-helpers.ts';

const RULE_DOSE = 'R5 DOSE';
const RULE_MODE = 'R6 MODE';
const RULE_SPINE = 'R7 SPINE';
const RULE_GEAR = 'R8 GEAR';
const CALISTHENICS_DOSE = /^\d+×\d+(?:–\d+)?(?:с| м| шагов)?(?:\/сторона)?$/;
const CALISTHENICS_MODES: ReadonlySet<ExerciseMode> = new Set([
	EXERCISE_MODE.calisthenic,
	EXERCISE_MODE.isometric
]);
const CALISTHENICS_KINDS: ReadonlySet<EquipmentKind> = new Set([
	EQUIPMENT_KIND.apparatus,
	EQUIPMENT_KIND.body,
	EQUIPMENT_KIND.environment,
	EQUIPMENT_KIND.tool
]);
const ERECTORS_CONTOUR = 'erectors';
const SPINE_PATTERNS = [
	'подъём ног',
	'подъём туловища',
	'складк',
	'сит-ап',
	'лодочк',
	'супермен',
	'ролик',
	'стойка на руках',
	'стойка на голове',
	'мостик',
	'велосипед',
	'ножниц',
	'скручивания',
	'наклон вперёд стоя'
];
const NEUTRAL_PATTERNS = ['до нейтрали', 'нейтрал', 'не прогибается', 'до линии тела'];
const NOTE_SEPARATOR = ' ';
const EMPTY_NOTE = '';
const NO_MAIN_GEAR = 'нет';

export const calisthenicsDoseFormat = (bank: Bank): Finding[] =>
	bankRecords(bank)
		.filter(({ exercise }) => !CALISTHENICS_DOSE.test(exercise.dose))
		.map(({ exercise }) => ({
			message: `${exercise.name}: доза ${exercise.dose}`,
			rule: RULE_DOSE,
			subject: exerciseSubject(bank, exercise)
		}));

export const calisthenicsMainGearKind = (bank: Bank, catalog: Catalog): Finding[] =>
	bankRecords(bank).flatMap(({ exercise }) => {
		const main = mainEquipmentOf(catalog, exercise);
		return ruleCheck(
			main !== undefined && CALISTHENICS_KINDS.has(main.kind),
			RULE_GEAR,
			exerciseSubject(bank, exercise),
			`${exercise.name}: главное средство ${main?.slug ?? NO_MAIN_GEAR} вида ${main?.kind ?? NO_MAIN_GEAR}`
		);
	});

export const calisthenicsModeMatchesDose = (bank: Bank): Finding[] =>
	bankRecords(bank).flatMap(({ exercise }) => {
		const isHeldInSeconds = parseDose(exercise.dose).unit === DOSE_UNIT.seconds;
		const subject = exerciseSubject(bank, exercise);
		return [
			...ruleCheck(
				CALISTHENICS_MODES.has(exercise.mode),
				RULE_MODE,
				subject,
				`${exercise.name}: mode=${exercise.mode}`
			),
			...ruleCheck(
				(exercise.mode === EXERCISE_MODE.isometric) === isHeldInSeconds,
				RULE_MODE,
				subject,
				`${exercise.name}: mode=${exercise.mode} не сходится с дозой ${exercise.dose}`
			)
		];
	});

export const calisthenicsSpineSafety = (bank: Bank): Finding[] =>
	bankRecords(bank).flatMap(({ contour, exercise }) => {
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
