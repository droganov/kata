import { describe, expect, it } from 'vitest';

import type { PlanExercise } from './plan-exercise.ts';
import type { Section, Slot, Timing } from './program.ts';
import type { PickedSection } from './session-minutes.ts';

import { exerciseSecondsOf, sessionMinutesOf } from './session-minutes.ts';

const TIMING: Timing = {
	hold_rest_sec: 10,
	rest_sec_accessory: 60,
	rest_sec_strength: 70,
	transition_sec: 45,
	warmup_general_min: 5,
	work_sec_per_set: 45
};

const exerciseOf = (id: string, dose: string, seconds?: number): PlanExercise => ({
	constraints: { axial: false, free_weight: false, lumbar_ext: false, lumbar_flex: false },
	dose,
	hasProcedure: true,
	id,
	mode: 'loaded',
	name: id,
	slug: id,
	...(seconds !== undefined && { seconds }),
	targets: []
});

const sectionOf = (mode: Section['mode']): Section => ({
	bank: 'bank',
	id: mode,
	mode,
	slots: [],
	slug: mode,
	title: mode
});

const slotOf = (secEach?: number): Slot => ({
	exercises: [],
	id: 'slot',
	kind: 'pool',
	label: 'Пул',
	pick: 2,
	...(secEach !== undefined && { sec_each: secEach })
});

describe('exerciseSecondsOf', () => {
	it('берёт готовые секунды позиции', () => {
		expect(exerciseSecondsOf(TIMING, exerciseOf('a', '10с × 5/сторона', 200))).toBe(200);
	});

	it('считает секунды удержаний из дозы и паузы между ними', () => {
		expect(exerciseSecondsOf(TIMING, exerciseOf('b', '3×10с'))).toBe(60);
	});

	it('не считает секунды у позиции в повторах', () => {
		expect(exerciseSecondsOf(TIMING, exerciseOf('c', '3×12–15'))).toBe(0);
	});
});

describe('sessionMinutesOf', () => {
	it('считает силовой раздел работой, отдыхом и переходами', () => {
		const sections: readonly PickedSection[] = [
			{
				picks: [
					{ exercises: [exerciseOf('a', '3×12–15')], slot: slotOf() },
					{ exercises: [exerciseOf('b', '2×15–20')], slot: slotOf() }
				],
				section: sectionOf('loaded')
			}
		];
		expect(sessionMinutesOf(TIMING, sections)).toBe(11);
	});

	it('считает размеренный раздел по sec_each пула и секундам базы', () => {
		const sections: readonly PickedSection[] = [
			{
				picks: [{ exercises: [], slot: slotOf(100) }],
				section: sectionOf('static_stretch')
			},
			{
				picks: [{ exercises: [exerciseOf('a', '3×10с')], slot: slotOf() }],
				section: sectionOf('isometric')
			}
		];
		expect(sessionMinutesOf(TIMING, sections)).toBe(4);
	});

	it('подставляет общий разогрев, когда раздел кардио пуст', () => {
		const sections: readonly PickedSection[] = [
			{ picks: [{ exercises: [], slot: slotOf() }], section: sectionOf('cardio') }
		];
		expect(sessionMinutesOf(TIMING, sections)).toBe(5);
	});

	it('считает кардио по sec_each, когда он задан', () => {
		const sections: readonly PickedSection[] = [
			{ picks: [{ exercises: [], slot: slotOf(120) }], section: sectionOf('cardio') }
		];
		expect(sessionMinutesOf(TIMING, sections)).toBe(4);
	});

	it('обходится без общего разогрева в расписании', () => {
		const timing: Timing = {
			hold_rest_sec: 10,
			rest_sec_accessory: 60,
			rest_sec_strength: 70,
			transition_sec: 45,
			work_sec_per_set: 45
		};
		const sections: readonly PickedSection[] = [
			{ picks: [{ exercises: [], slot: slotOf() }], section: sectionOf('cardio') }
		];
		expect(sessionMinutesOf(timing, sections)).toBe(0);
	});
});
