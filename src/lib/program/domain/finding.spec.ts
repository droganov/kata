import { describe, expect, it } from 'vitest';

import type { Program, Section, Slot } from './program.ts';

import { checkedGoals, PROGRAM_GOAL, programSubject, ruleCheck, slotSubject } from './finding.ts';

const SLOT: Slot = { exercises: [], id: 'slot-1', kind: 'base', label: 'База' };
const SECTION: Section = {
	bank: 'bank-1',
	id: 'section-1',
	mode: 'loaded',
	slots: [SLOT],
	slug: 'strength',
	title: 'Силовой'
};
const PROGRAM = {
	sections: [SECTION],
	title: 'Программа'
} as unknown as Program;

describe('finding', () => {
	it('молчит на пройденной проверке и говорит на провале', () => {
		expect(ruleCheck(true, PROGRAM_GOAL.glutes, 'R', 'S', 'M')).toEqual([]);
		expect(ruleCheck(false, PROGRAM_GOAL.glutes, 'R', 'S', 'M')).toEqual([
			{ goal: 'glutes', message: 'M', rule: 'R', subject: 'S' }
		]);
	});

	it('называет предмет проверки программой и слотом', () => {
		expect(programSubject(PROGRAM)).toBe('Программа');
		expect(slotSubject(PROGRAM, SECTION, SLOT)).toBe('Программа:strength/База');
	});

	it('перечисляет цели, у которых есть проверки', () => {
		expect(checkedGoals()).toContain('structure');
		expect(checkedGoals()).toHaveLength(7);
	});
});
