import { describe, expect, it } from 'vitest';

import {
	escapeForRegexp,
	firstWordOf,
	foldYo,
	hasLatin,
	hasStem,
	isAntonym,
	isInfinitive,
	normalizeLine,
	subjectOf,
	wordsOf
} from './text.ts';

describe('text', () => {
	it('снимает отрицания и лишние знаки при нормализации', () => {
		expect(normalizeLine('Заднее колено не на полу')).toBe(
			normalizeLine('заднее колено на полу')
		);
		expect(normalizeLine('без опоры на стену!')).toBe('опорынастену');
	});

	it('берёт субъект строки без предлогов и обрезает до пяти знаков', () => {
		expect(subjectOf('на полу лежит стопа')).toBe('полу');
		expect(subjectOf('таз ровен')).toBe('таз');
		expect(subjectOf('на')).toBe('');
	});

	it('ищет стем по началу слова', () => {
		expect(hasStem('ровн', 'дыхание ровное')).toBe(true);
		expect(hasStem('овн', 'дыхание ровное')).toBe(false);
		expect(hasStem('нейтрал', 'поясница нейтральна')).toBe(true);
	});

	it('видит антонимы одного субъекта и молчит на разных субъектах', () => {
		expect(isAntonym('корпус вертикален', 'корпус наклонён вперёд')).toBe(true);
		expect(isAntonym('корпус вертикален', 'таз наклонён вперёд')).toBe(false);
		expect(isAntonym('корпус вертикален', 'корпус вертикален')).toBe(false);
		expect(isAntonym('ягодица напряжена', 'ягодица расслаблена')).toBe(true);
	});

	it('различает инфинитив и существительное на -ть', () => {
		expect(isInfinitive('тянуть')).toBe(true);
		expect(isInfinitive('опереться')).toBe(true);
		expect(isInfinitive('рукоять')).toBe(false);
		expect(isInfinitive('челюсть')).toBe(false);
		expect(isInfinitive('плоскость')).toBe(false);
		expect(isInfinitive('часть')).toBe(false);
		expect(isInfinitive('')).toBe(false);
		expect(isInfinitive('таз')).toBe(false);
	});

	it('берёт первое слово и разбивает на слова', () => {
		expect(firstWordOf('  держать спину  ')).toBe('держать');
		expect(firstWordOf(' '.repeat(3))).toBe('');
		expect(wordsOf('таз ровен')).toEqual(['таз', 'ровен']);
	});

	it('видит латиницу и складывает ё', () => {
		expect(hasLatin('hip под тазом')).toBe(true);
		expect(hasLatin('таз ровен')).toBe(false);
		expect(foldYo('Вперёд')).toBe('вперед');
	});

	it('экранирует знаки регулярного выражения', () => {
		expect(escapeForRegexp('5.5')).toBe(String.raw`5\.5`);
	});
});
