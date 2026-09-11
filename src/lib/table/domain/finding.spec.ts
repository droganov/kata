import { describe, expect, it } from 'vitest';

import { lineSubject, ruleCheck, slugSubject } from './finding.ts';

describe('ruleCheck', () => {
	it('молчит, когда правило выполнено', () => {
		expect(ruleCheck(true, 'R1', 'subject', 'message')).toEqual([]);
	});

	it('отдаёт находку, когда правило нарушено', () => {
		expect(ruleCheck(false, 'R1', 'subject', 'message')).toEqual([
			{ message: 'message', rule: 'R1', subject: 'subject' }
		]);
	});
});

describe('подлежащее находки', () => {
	it('нумерует строки с единицы', () => {
		expect(lineSubject('target', 0)).toBe('target:1');
	});

	it('называет строку по slug', () => {
		expect(slugSubject('exercise', 'pulldown')).toBe('exercise: pulldown');
	});
});
