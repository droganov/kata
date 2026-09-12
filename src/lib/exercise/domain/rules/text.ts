import { ANTONYMS, NOUN_LIKE_INFINITIVE, STOP_SUBJECTS } from './lexicon.ts';
import { LATIN } from './patterns.ts';

const YO = 'ё';
const YE = 'е';
const EMPTY = '';
const SUBJECT_STEM_LENGTH = 5;
const INFINITIVE = /(?:ть|чь|йти|сти|зти)(?:ся)?$/u;
const NOUN_TAIL = /(?:ость|асть)$/u;
const NEGATOR = /(?<![\p{L}\p{N}_])(?:не|нет|без)(?![\p{L}\p{N}_])/gu;
const NOT_LETTER_OR_DIGIT = /[^а-я0-9]/gu;
const NOT_CYRILLIC_OR_SPACE = /[^а-яё ]/gu;
const SPACES = /\s+/u;
const REGEXP_SPECIAL = /[$()*+.?[\\\]^{|}]/gu;

const STEM_START = '(?<![а-я])';
const UNICODE_FLAG = 'u';

export const escapeForRegexp = (text: string): string =>
	text.replaceAll(REGEXP_SPECIAL, (match) => `\\${match}`);

export const firstWordOf = (text: string): string => {
	const words = wordsOf(text);
	return words[0] ?? EMPTY;
};

export const foldYo = (text: string): string => text.toLowerCase().replaceAll(YO, () => YE);

export const hasLatin = (text: string): boolean => LATIN.test(text);

export const hasStem = (stem: string, text: string): boolean =>
	new RegExp(`${STEM_START}${escapeForRegexp(foldYo(stem))}`, UNICODE_FLAG).test(text);

export const isAntonym = (model: string, counter: string): boolean => {
	const modelText = foldYo(model);
	const counterText = foldYo(counter);
	if (subjectOf(model) !== subjectOf(counter)) return false;
	return ANTONYMS.some(([first, second]) =>
		isOppositePair(first, second, modelText, counterText)
	);
};

export const isInfinitive = (word: string): boolean => {
	const folded = foldYo(word);
	if (folded === EMPTY || NOUN_LIKE_INFINITIVE.has(folded) || NOUN_TAIL.test(folded))
		return false;
	return INFINITIVE.test(folded);
};

export const normalizeLine = (text: string): string =>
	foldYo(text).replaceAll(NEGATOR, '').replaceAll(NOT_LETTER_OR_DIGIT, '');

export const subjectOf = (text: string): string => {
	const found = text
		.toLowerCase()
		.replaceAll(NOT_CYRILLIC_OR_SPACE, '')
		.split(SPACES)
		.find((word) => word !== EMPTY && !STOP_SUBJECTS.has(word));
	const first = found ?? EMPTY;
	return first.slice(0, SUBJECT_STEM_LENGTH);
};

export const wordsOf = (text: string): readonly string[] =>
	text.split(SPACES).filter((word) => word !== EMPTY);

const isOppositeDirection = (
	present: string,
	absent: string,
	modelText: string,
	counterText: string
): boolean =>
	hasStem(present, modelText) &&
	hasStem(absent, counterText) &&
	!hasStem(present, counterText) &&
	!hasStem(absent, modelText);

const isOppositePair = (
	first: string,
	second: string,
	modelText: string,
	counterText: string
): boolean =>
	isOppositeDirection(first, second, modelText, counterText) ||
	isOppositeDirection(second, first, modelText, counterText);
