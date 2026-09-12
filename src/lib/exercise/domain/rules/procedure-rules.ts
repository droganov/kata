import type { Exercise, ExerciseRecord, Procedure } from '../exercise.ts';
import type { Issue } from '../finding.ts';
import type { ExerciseCheck } from './exercise-check.ts';

import { parseDose } from '../../../shared/dose.ts';
import { issueCheck } from '../finding.ts';
import { ERECTOR_END, SIDE_MENTION, SPINE_NEUTRAL } from './patterns.ts';
import { RULE } from './rule-codes.ts';
import { STEP_TYPE, stepTypeOf } from './step-type.ts';
import { escapeForRegexp } from './text.ts';

const PROCEDURE_FIELDS: readonly string[] = ['id', 'steps'];
const MIN_STEPS = 2;
const SPACE = ' ';
const PROCEDURE_SHAPE_MESSAGE = 'procedure.steps отсутствует или < 2';
const NO_SOURCE_MESSAGE = 'нет источника';
const START_MESSAGE = 'первый шаг не установка/исходное: ';
const SWITCH_LAST_MESSAGE = '«Сменить сторону» последним: ';
const DOSE_MARK = ', доза ';
const SIDE_WITHOUT_DOSE_MESSAGE = 'есть смена стороны, а доза без «/сторона»: ';
const NO_DIRECTION_MESSAGE = 'нет шага «Сменить направление» при дозе ';
const NO_HOLD_MESSAGE = 'нет шага удержания при секундной дозе';
const NO_REPEAT_MESSAGE = 'нет шага повтора при повторной дозе';
const DOSE_NUMBER_MESSAGE = 'число дозы ';
const DOSE_NUMBER_TAIL = ' не встречается в title/predicate';
const OPEN_BRACKET = ' (';
const CLOSE_BRACKET = ')';
const DUPLICATE_PREDICATES_MESSAGE = 'повторяющиеся предикаты';
const NO_SPINE_MESSAGE = 'нет строки о нейтрали поясницы/спины';
const NO_ERECTOR_MESSAGE = 'контур разгибателей: нет «до нейтрали|до линии»';
const SWITCH_PREFIX = 'сменить сторон';
const DIRECTION_PREFIX = 'сменить направлен';
const EACH_LEG_INSTRUMENTAL = 'каждой ногой';
const EACH_DIRECTION = 'в каждую сторону';
const ERECTOR_SLUG = 'erector';
const ERECTOR_TITLE = 'разгибател';
const REPS_UNIT = 'reps';
const START_TYPES: ReadonlySet<string> = new Set([STEP_TYPE.initial, STEP_TYPE.setup]);
const NUMBER_GUARD_HEAD = String.raw`(?<!\d)`;
const NUMBER_GUARD_TAIL = String.raw`(?!\d)`;
const UNICODE_FLAG = 'u';

export const cycleIssues = (exercise: Exercise, titles: readonly string[]): readonly Issue[] => {
	if (titles.length === 0) return [];
	const dose = parseDose(exercise.dose);
	const isPerSide = dose.isPerSide || exercise.dose.includes(EACH_LEG_INSTRUMENTAL);
	const types = titles.map((title) => stepTypeOf(title));
	const hasSwitchLast = titles.slice(-1).some((title) => title.startsWith(SWITCH_PREFIX));
	return [
		...startIssues(titles),
		...issueCheck(
			isPerSide === hasSwitchLast,
			RULE.cycle,
			`${SWITCH_LAST_MESSAGE}${String(hasSwitchLast)}${DOSE_MARK}${exercise.dose}`
		),
		...issueCheck(
			titles.every((title) => !SIDE_MENTION.test(title)) || isPerSide,
			RULE.cycle,
			`${SIDE_WITHOUT_DOSE_MESSAGE}${exercise.dose}`
		),
		...issueCheck(
			!exercise.dose.includes(EACH_DIRECTION) ||
				titles.some((title) => title.startsWith(DIRECTION_PREFIX)),
			RULE.cycle,
			`${NO_DIRECTION_MESSAGE}${exercise.dose}`
		),
		...unitIssues(dose.unit === REPS_UNIT, types)
	];
};

export const distinctIssues = (normalizedPredicates: readonly string[]): readonly Issue[] =>
	issueCheck(
		new Set(normalizedPredicates).size === normalizedPredicates.length,
		RULE.distinct,
		DUPLICATE_PREDICATES_MESSAGE
	);

export const doseIssues = (exercise: Exercise, texts: readonly string[]): readonly Issue[] => {
	const text = texts.join(SPACE);
	return parseDose(exercise.dose)
		.numbers.filter((number) => !hasNumber(text, number))
		.map((number) => ({
			message: `${DOSE_NUMBER_MESSAGE}${number}${OPEN_BRACKET}${exercise.dose}${CLOSE_BRACKET}${DOSE_NUMBER_TAIL}`,
			rule: RULE.dose
		}));
};

export const procedureFormIssues = (procedure: Procedure): readonly Issue[] => {
	const keys = Object.keys(procedure);
	const hasShape =
		keys.length === PROCEDURE_FIELDS.length &&
		PROCEDURE_FIELDS.every((field) => keys.includes(field)) &&
		procedure.steps.length >= MIN_STEPS;
	return issueCheck(hasShape, RULE.present, PROCEDURE_SHAPE_MESSAGE);
};

export const sourceIssues = (check: ExerciseCheck): readonly Issue[] =>
	issueCheck(!check.shouldUseVerdicts || check.hasSource, RULE.source, NO_SOURCE_MESSAGE);

export const spineIssues = (
	record: ExerciseRecord,
	modelTexts: readonly string[]
): readonly Issue[] => {
	const isErectorContour =
		record.contourSlug.includes(ERECTOR_SLUG) ||
		record.contourTitle.toLowerCase().includes(ERECTOR_TITLE);
	return [
		...issueCheck(
			modelTexts.some((text) => SPINE_NEUTRAL.test(text)),
			RULE.spine,
			NO_SPINE_MESSAGE
		),
		...issueCheck(
			!isErectorContour || modelTexts.some((text) => ERECTOR_END.test(text)),
			RULE.spine,
			NO_ERECTOR_MESSAGE
		)
	];
};

const hasNumber = (text: string, number: string): boolean =>
	new RegExp(
		`${NUMBER_GUARD_HEAD}${escapeForRegexp(number)}${NUMBER_GUARD_TAIL}`,
		UNICODE_FLAG
	).test(text);

const startIssues = (titles: readonly string[]): readonly Issue[] =>
	titles
		.slice(0, 1)
		.filter((title) => !START_TYPES.has(stepTypeOf(title)))
		.map((title) => ({ message: `${START_MESSAGE}${title}`, rule: RULE.cycle }));

const unitIssues = (isRepsUnit: boolean, types: readonly string[]): readonly Issue[] => {
	if (isRepsUnit)
		return issueCheck(
			types.includes(STEP_TYPE.repeat) || types.includes(STEP_TYPE.hold),
			RULE.cycle,
			NO_REPEAT_MESSAGE
		);
	return issueCheck(types.includes(STEP_TYPE.hold), RULE.cycle, NO_HOLD_MESSAGE);
};
