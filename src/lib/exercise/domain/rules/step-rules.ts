import type { Oracle, Step } from '../exercise.ts';
import type { Issue } from '../finding.ts';
import type { CoverageClass } from './coverage.ts';
import type { ExerciseCheck } from './exercise-check.ts';
import type { StepType } from './step-type.ts';

import { parseDose } from '../../../shared/dose.ts';
import { stepModelOf, targetIdsOf } from '../exercise.ts';
import { counterClassesOf, frameClassesOf, MODEL_COVERAGE } from './coverage.ts';
import { oracleIssues } from './oracle-rules.ts';
import { LOWER_BACK } from './patterns.ts';
import { RULE } from './rule-codes.ts';
import { isWorkingType, stepTypeOf } from './step-type.ts';
import { firstWordOf, hasLatin, isInfinitive, normalizeLine } from './text.ts';

const STEP_LABEL = 'шаг ';
const ORACLE_LABEL = ' оракул ';
const TYPE_OPEN = ' [';
const TYPE_CLOSE = ']';
const TAG_GAP = ': ';
const SPACE = ' ';
const COMMA_LIST = ', ';
const TITLE_MIN_LENGTH = 3;
const TITLE_MAX_LENGTH = 60;
const COMMA = ',';
const ACTIVE_FIELD = 'active';
const STEP_FIELDS: readonly string[] = ['id', 'oracles', 'title'];
const ORACLE_FIELDS: readonly string[] = ['counterModel', 'id', 'model', 'predicate'];
const IGNORED_STEP_FIELDS: readonly string[] = [ACTIVE_FIELD];
const NO_IGNORED_FIELDS: readonly string[] = [];
const STEP_SHAPE_MESSAGE = 'форма шага';
const ORACLE_SHAPE_MESSAGE = 'форма оракула';
const ORACLE_LISTS_MESSAGE = 'model/counterModel';
const NO_ACTIVE_MESSAGE = 'нет поля active';
const ACTIVE_REPEATS_MESSAGE = 'active не список без повторов';
const ACTIVE_OUTSIDE_MESSAGE = 'active вне targets: ';
const ACTIVE_UNKNOWN_MESSAGE = 'active вне каталога целей: ';
const ACTIVE_EMPTY_MESSAGE = 'active пуст в шаге ';
const MODEL_CLASS_MESSAGE = ' model: нет класса «';
const COUNTER_CLASS_MESSAGE = ' counterModel: нет класса «';
const FRAME_CLASS_MESSAGE = ': не задано «';
const CLASS_CLOSE = '»';
const EMPTY = '';

export interface StepScan {
	readonly counterText: string;
	readonly issues: readonly Issue[];
	readonly modelText: string;
	readonly normalizedPredicates: readonly string[];
	readonly texts: readonly string[];
}

export const stepScan = (check: ExerciseCheck, step: Step, at: number): StepScan => {
	const tag = `${STEP_LABEL}${String(at)}`;
	if (!hasStepShape(step))
		return {
			counterText: EMPTY,
			issues: [{ message: `${tag}${TAG_GAP}${STEP_SHAPE_MESSAGE}`, rule: RULE.present }],
			modelText: EMPTY,
			normalizedPredicates: [],
			texts: []
		};
	const shaped = step.oracles.filter((oracle) => hasOracleShape(oracle));
	const type = stepTypeOf(step.title);
	const modelText = loweredText([
		...shaped.flatMap((oracle) => oracle.model),
		step.title,
		...shaped.map((oracle) => oracle.predicate)
	]);
	const counterText = loweredText(shaped.flatMap((oracle) => oracle.counterModel));
	return {
		counterText,
		issues: [
			...activeIssues(check, step, tag, type),
			...titleIssues(step.title, tag),
			...oraclesIssues(check, step, tag),
			...coverageIssues(
				MODEL_COVERAGE[type],
				modelText,
				`${tag}${typeMark(type)}${MODEL_CLASS_MESSAGE}`,
				RULE.modelCoverage
			),
			...frameIssues(check, step, tag, type, modelText),
			...coverageIssues(
				counterClassesOf(type, LOWER_BACK.test(modelText) && isWorkingType(type)),
				counterText,
				`${tag}${typeMark(type)}${COUNTER_CLASS_MESSAGE}`,
				RULE.counterCoverage
			)
		],
		modelText,
		normalizedPredicates: shaped.map((oracle) => normalizeLine(oracle.predicate)),
		texts: [step.title, ...shaped.map((oracle) => oracle.predicate)]
	};
};

const activeIssues = (
	check: ExerciseCheck,
	step: Step,
	tag: string,
	type: StepType
): readonly Issue[] => {
	if (!Object.hasOwn(step, ACTIVE_FIELD))
		return [{ message: `${tag}${TAG_GAP}${NO_ACTIVE_MESSAGE}`, rule: RULE.active }];
	const active = step.active;
	const emptyIssues =
		isWorkingType(type) && active.length === 0
			? [{ message: `${tag}${TAG_GAP}${ACTIVE_EMPTY_MESSAGE}${type}`, rule: RULE.active }]
			: [];
	return [...activeSetIssues(check, active, tag), ...emptyIssues];
};

const activeSetIssues = (
	check: ExerciseCheck,
	active: readonly string[],
	tag: string
): readonly Issue[] => {
	if (new Set(active).size !== active.length)
		return [{ message: `${tag}${TAG_GAP}${ACTIVE_REPEATS_MESSAGE}`, rule: RULE.active }];
	const targetIds = targetIdsOf(check.record.exercise);
	const outside = active.filter((id) => !targetIds.has(id));
	const unknown = active.filter((id) => !check.knownTargetIds.has(id));
	return [
		...missingRefIssues(outside, `${tag}${TAG_GAP}${ACTIVE_OUTSIDE_MESSAGE}`),
		...missingRefIssues(unknown, `${tag}${TAG_GAP}${ACTIVE_UNKNOWN_MESSAGE}`)
	];
};

const coverageIssues = (
	classes: readonly CoverageClass[],
	text: string,
	prefix: string,
	rule: string
): readonly Issue[] =>
	classes
		.filter((coverage) => !coverage.pattern.test(text))
		.map((coverage) => ({ message: `${prefix}${coverage.name}${CLASS_CLOSE}`, rule }));

const frameIssues = (
	check: ExerciseCheck,
	step: Step,
	tag: string,
	type: StepType,
	modelText: string
): readonly Issue[] => {
	const isPerSide = parseDose(check.record.exercise.dose).isPerSide;
	return coverageIssues(
		frameClassesOf(type, check.hasMainGear, isPerSide),
		loweredText([step.title, modelText]),
		`${tag}${typeMark(type)}${FRAME_CLASS_MESSAGE}`,
		RULE.frame
	);
};

const hasFields = (
	value: object,
	fields: readonly string[],
	ignored: readonly string[]
): boolean => {
	const keys = Object.keys(value).filter((key) => !ignored.includes(key));
	return keys.length === fields.length && fields.every((field) => keys.includes(field));
};

const hasOracleShape = (oracle: Oracle): boolean => {
	if (!hasFields(oracle, ORACLE_FIELDS, NO_IGNORED_FIELDS)) return false;
	return oracle.model.length > 0 && oracle.counterModel.length > 0;
};

const hasStepShape = (step: Step): boolean =>
	hasFields(step, STEP_FIELDS, IGNORED_STEP_FIELDS) && step.oracles.length > 0;

const loweredText = (parts: readonly string[]): string =>
	parts.map((part) => part.toLowerCase()).join(SPACE);

const missingRefIssues = (missing: readonly string[], prefix: string): readonly Issue[] => {
	if (missing.length === 0) return [];
	return [
		{
			message: `${prefix}${missing.toSorted((first, second) => first.localeCompare(second)).join(COMMA_LIST)}`,
			rule: RULE.active
		}
	];
};

const oracleShapeIssues = (tag: string, oracle: Oracle): readonly Issue[] => {
	if (!hasFields(oracle, ORACLE_FIELDS, NO_IGNORED_FIELDS))
		return [{ message: `${tag}${TAG_GAP}${ORACLE_SHAPE_MESSAGE}`, rule: RULE.present }];
	return [{ message: `${tag}${TAG_GAP}${ORACLE_LISTS_MESSAGE}`, rule: RULE.present }];
};

const oraclesIssues = (check: ExerciseCheck, step: Step, tag: string): readonly Issue[] => {
	const stepModel = stepModelOf(step);
	return step.oracles.flatMap((oracle, index) => {
		const oracleTag = `${tag}${ORACLE_LABEL}${String(index + 1)}`;
		if (!hasOracleShape(oracle)) return oracleShapeIssues(oracleTag, oracle);
		return oracleIssues({
			independentLines: check.independentLines,
			oracle,
			shouldUseVerdicts: check.shouldUseVerdicts,
			stepModel,
			tag: oracleTag
		});
	});
};

const titleIssues = (title: string, tag: string): readonly Issue[] => {
	const isBad =
		!isInfinitive(firstWordOf(title.toLowerCase())) ||
		title.includes(COMMA) ||
		title.length < TITLE_MIN_LENGTH ||
		title.length > TITLE_MAX_LENGTH ||
		hasLatin(title);
	return isBad ? [{ message: `${tag}${TAG_GAP}${title}`, rule: RULE.title }] : [];
};

const typeMark = (type: StepType): string => `${TYPE_OPEN}${type}${TYPE_CLOSE}`;
