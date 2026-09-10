import type { Oracle } from '../exercise.ts';
import type { Issue } from '../finding.ts';

import { counterLineKey } from '../verdict.ts';
import { BAD_ATOM, COMMAND, EVALUATIVE, VAGUE, WRAPPER } from './lexicon.ts';
import { VIEW_NOISE } from './patterns.ts';
import { RULE } from './rule-codes.ts';
import { firstWordOf, hasLatin, isAntonym, isInfinitive, normalizeLine, wordsOf } from './text.ts';

const TEXT_MIN_LENGTH = 3;
const TEXT_MAX_LENGTH = 90;
const PREDICATE_MIN_WORDS = 2;
const MODEL_FIELD = 'model';
const COUNTER_FIELD = 'counterModel';
const FIELD_GAP = ' ';
const TAG_GAP = ': ';
const DASH = ' — ';
const REPEATS_MESSAGE = 'повторы';
const DISJOINT_MESSAGE = 'predicate повторяет строку списка';
const CROSS_MESSAGE = 'общие строки model/counterModel';
const LEXICAL_NEGATION_MESSAGE = 'лексическое отрицание строки model шага';
const ANTONYM_MESSAGE = 'антоним строки model шага ';
const NO_VERDICT_MESSAGE = 'нет вердикта «независима»';

export interface OracleContext {
	readonly independentLines: ReadonlySet<string>;
	readonly oracle: Oracle;
	readonly shouldUseVerdicts: boolean;
	readonly stepModel: readonly string[];
	readonly tag: string;
}

export function oracleIssues(context: OracleContext): readonly Issue[] {
	const { oracle, tag } = context;
	return [
		...predicateIssues(tag, oracle.predicate),
		...wrapperIssues(tag, oracle.predicate),
		...disjointIssues(tag, oracle),
		...listIssues(tag, MODEL_FIELD, oracle.model),
		...listIssues(tag, COUNTER_FIELD, oracle.counterModel),
		...crossIssues(tag, oracle),
		...counterLineIssues(context)
	];
}

function antonymIssues(context: OracleContext, line: string): readonly Issue[] {
	const source = context.stepModel.find((modelLine) => isAntonym(modelLine, line));
	if (source === undefined) return [];
	return [
		{
			message: `${context.tag}${TAG_GAP}${line}${DASH}${ANTONYM_MESSAGE}${source}`,
			rule: RULE.negation
		}
	];
}

function counterLineIssues(context: OracleContext): readonly Issue[] {
	return context.oracle.counterModel.flatMap((line) => [
		...lexicalNegationIssues(context, line),
		...antonymIssues(context, line),
		...verdictIssues(context, line)
	]);
}

function crossIssues(tag: string, oracle: Oracle): readonly Issue[] {
	const modelKeys = new Set(oracle.model.map((line) => normalizeLine(line)));
	const hasCross = oracle.counterModel.some((line) => modelKeys.has(normalizeLine(line)));
	return hasCross ? [{ message: `${tag}${TAG_GAP}${CROSS_MESSAGE}`, rule: RULE.unique }] : [];
}

function disjointIssues(tag: string, oracle: Oracle): readonly Issue[] {
	const keys = new Set(
		[...oracle.model, ...oracle.counterModel].map((line) => normalizeLine(line))
	);
	if (!keys.has(normalizeLine(oracle.predicate))) return [];
	return [{ message: `${tag}${TAG_GAP}${DISJOINT_MESSAGE}`, rule: RULE.disjoint }];
}

function hasBadLength(text: string): boolean {
	return text.length < TEXT_MIN_LENGTH || text.length > TEXT_MAX_LENGTH;
}

function lexicalNegationIssues(context: OracleContext, line: string): readonly Issue[] {
	const keys = new Set(context.stepModel.map((line) => normalizeLine(line)));
	if (!keys.has(normalizeLine(line))) return [];
	return [
		{
			message: `${context.tag}${TAG_GAP}${line}${DASH}${LEXICAL_NEGATION_MESSAGE}`,
			rule: RULE.negation
		}
	];
}

function lineIssues(tag: string, field: string, line: string): readonly Issue[] {
	const lowered = line.toLowerCase();
	const place = `${tag}${FIELD_GAP}${field}${TAG_GAP}${line}`;
	const issues: Issue[] = [];
	if (BAD_ATOM.some((bad) => line.includes(bad)) || hasBadLength(line))
		issues.push({ message: place, rule: RULE.atomic });
	if (hasLatin(line) || VIEW_NOISE.test(lowered))
		issues.push({ message: place, rule: RULE.noise });
	if (COMMAND.some((bad) => lowered.includes(bad)) || isInfinitive(firstWordOf(lowered)))
		issues.push({ message: place, rule: RULE.observe });
	if (EVALUATIVE.some((bad) => lowered.includes(bad)))
		issues.push({ message: place, rule: RULE.falsify });
	if (field === COUNTER_FIELD && VAGUE.some((bad) => lowered.includes(bad)))
		issues.push({ message: `${tag}${TAG_GAP}${line}`, rule: RULE.specific });
	return issues;
}

function listIssues(tag: string, field: string, lines: readonly string[]): readonly Issue[] {
	const repeats =
		new Set(lines).size === lines.length
			? []
			: [
					{
						message: `${tag}${FIELD_GAP}${field}${TAG_GAP}${REPEATS_MESSAGE}`,
						rule: RULE.unique
					}
				];
	return [...lines.flatMap((line) => lineIssues(tag, field, line)), ...repeats];
}

function predicateIssues(tag: string, predicate: string): readonly Issue[] {
	const isBad =
		BAD_ATOM.some((bad) => predicate.includes(bad)) ||
		hasBadLength(predicate) ||
		hasLatin(predicate) ||
		wordsOf(predicate).length < PREDICATE_MIN_WORDS;
	return isBad ? [{ message: `${tag}${TAG_GAP}${predicate}`, rule: RULE.predicate }] : [];
}

function verdictIssues(context: OracleContext, line: string): readonly Issue[] {
	if (!context.shouldUseVerdicts) return [];
	if (context.independentLines.has(counterLineKey(context.oracle.id, line))) return [];
	return [
		{
			message: `${context.tag}${TAG_GAP}${line}${DASH}${NO_VERDICT_MESSAGE}`,
			rule: RULE.effect
		}
	];
}

function wrapperIssues(tag: string, predicate: string): readonly Issue[] {
	const lowered = predicate.toLowerCase();
	if (WRAPPER.every((bad) => !lowered.includes(bad))) return [];
	return [{ message: `${tag}${TAG_GAP}${predicate}`, rule: RULE.wrapper }];
}
