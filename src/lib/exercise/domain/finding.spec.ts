import { describe, expect, it } from 'vitest';

import { findingsOf, issueCheck } from './finding.ts';

describe('finding', () => {
	it('молчит на пройденной проверке и говорит на провале', () => {
		expect(issueCheck(true, 'O1 PRESENT', 'нет')).toEqual([]);
		expect(issueCheck(false, 'O1 PRESENT', 'нет')).toEqual([
			{ message: 'нет', rule: 'O1 PRESENT' }
		]);
	});

	it('добавляет подпись записи', () => {
		expect(findingsOf('stretch:lunge', [{ message: 'нет', rule: 'O1 PRESENT' }])).toEqual([
			{ message: 'нет', rule: 'O1 PRESENT', subject: 'stretch:lunge' }
		]);
	});
});
