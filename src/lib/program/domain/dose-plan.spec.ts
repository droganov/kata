import { describe, expect, it } from 'vitest';

import { holdSecondsOfDose, setsOfDose } from './dose-plan.ts';

describe('setsOfDose', () => {
	it('берёт множитель перед знаком повтора', () => {
		expect(setsOfDose('3×12–15')).toBe(3);
		expect(setsOfDose('2×15–20/сторона')).toBe(2);
		expect(setsOfDose('3×10с')).toBe(3);
	});

	it('берёт множитель после удержания', () => {
		expect(setsOfDose('40с × 2')).toBe(2);
		expect(setsOfDose('10с × 5/сторона')).toBe(5);
		expect(setsOfDose('20с × 3')).toBe(3);
	});

	it('считает один подход, когда множителя нет', () => {
		expect(setsOfDose('10')).toBe(1);
		expect(setsOfDose('по 10 в каждую сторону')).toBe(1);
		expect(setsOfDose('5 мин')).toBe(1);
	});
});

describe('holdSecondsOfDose', () => {
	it('находит секунды удержания в любом порядке записи', () => {
		expect(holdSecondsOfDose('3×10с')).toBe(10);
		expect(holdSecondsOfDose('40с × 2')).toBe(40);
		expect(holdSecondsOfDose('10 с')).toBe(10);
		expect(holdSecondsOfDose('3×30с/сторона')).toBe(30);
	});

	it('не находит удержания в повторах и минутах', () => {
		expect(holdSecondsOfDose('3×12–15')).toBe(0);
		expect(holdSecondsOfDose('5 мин')).toBe(0);
	});
});
