import { describe, expect, it } from 'vitest';

import type { PlanExercise } from './plan-exercise.ts';
import type { Program } from './program.ts';

import { programPlanOf } from './program-plan.ts';

const exerciseOf = (id: string): PlanExercise => ({
	constraints: { axial: false, free_weight: false, lumbar_ext: false, lumbar_flex: false },
	dose: '3×12–15',
	hasProcedure: true,
	id,
	mode: 'loaded',
	name: id,
	slug: id,
	targets: [{ group: 'glutes', role: 'primary' }]
});

const PROGRAM = {
	schedule: { rotation_weeks: 1, session_budget_min: 70, sessions_per_week: 2 },
	sections: [
		{
			bank: 'bank',
			id: 'strength',
			mode: 'loaded',
			slots: [{ exercises: ['a'], id: 'base', kind: 'base', label: 'База' }],
			slug: 'strength',
			title: 'Силовой'
		}
	],
	timing: {
		hold_rest_sec: 10,
		rest_sec_accessory: 60,
		rest_sec_strength: 70,
		transition_sec: 45,
		work_sec_per_set: 45
	},
	title: 'Программа'
} as unknown as Program;

describe('programPlanOf', () => {
	it('собирает занятия и объём вокруг программы', () => {
		const plan = programPlanOf(PROGRAM, new Map([['a', exerciseOf('a')]]), new Set(['hip']));
		expect(plan.sessions.map((session) => session.slug)).toEqual(['w1d1', 'w1d2']);
		expect(plan.volume.volume.get('glutes')).toBe(6);
		expect(plan.hipMobilityExerciseIds.has('hip')).toBe(true);
		expect(plan.program).toBe(PROGRAM);
		expect(plan.exercises.size).toBe(1);
	});
});
