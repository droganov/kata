import { describe, expect, it } from 'vitest';

import type { PlanExercise } from './plan-exercise.ts';
import type { Program } from './program.ts';
import type { Session, SessionSection } from './session.ts';

import { PROGRAM_BASE } from '../../../test/program-base.ts';
import { groupFrequencyOf, groupVolumeOf, weeklyVolumeOf } from './weekly-volume.ts';

const PROGRAM: Program = {
	...PROGRAM_BASE,
	schedule: { rotation_weeks: 2, session_budget_min: 70, sessions_per_week: 1 }
};

const exerciseOf = (id: string, targets: PlanExercise['targets']): PlanExercise => ({
	constraints: { axial: false, free_weight: false, lumbar_ext: false, lumbar_flex: false },
	dose: '2×12',
	hasProcedure: true,
	id,
	mode: 'loaded',
	name: id,
	slug: id,
	targets
});

const sectionOf = (
	mode: SessionSection['mode'],
	exercises: readonly PlanExercise[]
): SessionSection => ({
	mode,
	section: mode,
	slots: [{ exercises, kind: 'pool', label: 'Пул', slot: 'slot' }],
	slug: mode,
	title: mode
});

const sessionOf = (index: number, sections: readonly SessionSection[]): Session => ({
	index,
	minutes: 60,
	program: 'program',
	sections,
	slug: `w1d${String(index)}`,
	title: `Занятие ${String(index)}`
});

describe('weeklyVolumeOf', () => {
	it('считает подходы по группам за неделю только в силовых разделах', () => {
		const loaded = exerciseOf('press', [
			{ group: 'chest', role: 'primary' },
			{ group: 'delts', role: 'secondary' },
			{ group: 'back', role: 'stabilizer' }
		]);
		const stretch = exerciseOf('st', [{ group: 'chest', role: 'primary' }]);
		const weekly = weeklyVolumeOf(PROGRAM, [
			sessionOf(1, [sectionOf('loaded', [loaded]), sectionOf('static_stretch', [stretch])]),
			sessionOf(2, [sectionOf('loaded', [loaded])])
		]);
		expect(groupVolumeOf(weekly, 'chest')).toBe(2);
		expect(groupVolumeOf(weekly, 'delts')).toBe(1);
		expect(groupVolumeOf(weekly, 'back')).toBe(0);
		expect(groupVolumeOf(weekly, 'quads')).toBe(0);
	});

	it('считает частоту по занятиям, где группа нагружена ощутимо', () => {
		const first = exerciseOf('a', [
			{ group: 'chest', role: 'primary' },
			{ group: 'back', role: 'stabilizer' }
		]);
		const second = exerciseOf('b', [{ group: 'chest', role: 'secondary' }]);
		const weekly = weeklyVolumeOf(PROGRAM, [
			sessionOf(1, [sectionOf('loaded', [first])]),
			sessionOf(2, [sectionOf('loaded', [second])])
		]);
		expect(groupFrequencyOf(weekly, 'chest')).toBe(1);
		expect(groupFrequencyOf(weekly, 'back')).toBe(0);
	});
});
