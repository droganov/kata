import { describe, expect, it } from 'vitest';

import { parseDose } from './dose';

describe('parseDose', () => {
	it('подходы × повторы', () => {
		expect(parseDose('3×12–15')).toEqual({
			isPerSide: false,
			numbers: ['12', '15'],
			text: '3×12–15',
			unit: 'reps'
		});
	});
	it('секунды на сторону', () => {
		const dose = parseDose('2×30с/сторона');
		expect(dose.unit).toBe('seconds');
		expect(dose.numbers).toEqual(['30']);
		expect(dose.isPerSide).toBe(true);
	});
	it('старый формат удержания «10с × 5»', () => {
		expect(parseDose('10с × 5/сторона').numbers).toEqual(['10', '5']);
	});
	it('минуты с дробью раскрываются в минуты и секунды', () => {
		expect(parseDose('5.5 мин')).toEqual({
			isPerSide: false,
			numbers: ['5', '30'],
			text: '5.5 мин',
			unit: 'minutes'
		});
	});
	it('повторы без подходов и «каждая нога»', () => {
		expect(parseDose('8')).toEqual({
			isPerSide: false,
			numbers: ['8'],
			text: '8',
			unit: 'reps'
		});
		expect(parseDose('10 каждая нога').isPerSide).toBe(true);
	});
});
