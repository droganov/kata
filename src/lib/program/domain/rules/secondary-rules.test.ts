import { describe, expect, it } from 'vitest';

import type { PlanExercise } from '../plan-exercise.ts';
import type { ProgramPlan } from '../program-plan.ts';
import type { Program } from '../program.ts';
import type { Session } from '../session.ts';

import { aerobicWeeklyMinutes, staticStretchEverySession } from './secondary-rules.ts';

const exerciseOf = (id: string): PlanExercise => ({
	constraints: { axial: false, free_weight: false, lumbar_ext: false, lumbar_flex: false },
	dose: '40с × 2',
	hasProcedure: true,
	id,
	mode: 'static_stretch',
	name: id,
	slug: id,
	targets: []
});

const programOf = (
	warmupMinutes: number | undefined,
	perWeek: number,
	walkingMinutes: number | undefined
): Program =>
	({
		...(walkingMinutes !== undefined && {
			outside_gym: {
				walking: {
					intensity: 'moderate',
					min_per_session: walkingMinutes,
					name: 'Ходьба',
					sessions_per_week: 4
				}
			}
		}),
		schedule: { rotation_weeks: 2, session_budget_min: 70, sessions_per_week: perWeek },
		timing: {
			hold_rest_sec: 10,
			rest_sec_accessory: 60,
			rest_sec_strength: 70,
			transition_sec: 45,
			work_sec_per_set: 45,
			...(warmupMinutes !== undefined && { warmup_general_min: warmupMinutes })
		},
		title: 'Программа'
	}) as unknown as Program;

const sessionOf = (count: number): Session => ({
	index: 1,
	minutes: 60,
	program: 'program',
	sections: [
		{
			mode: 'static_stretch',
			section: 'stretch',
			slots: [
				{
					exercises: Array.from({ length: count }, (unused, at) =>
						exerciseOf(`st${String(at)}`)
					),
					kind: 'pool',
					label: 'Растяжка',
					slot: 'pool'
				}
			],
			slug: 'stretch',
			title: 'Растяжка'
		}
	],
	slug: 'w1d1',
	title: 'Занятие 1'
});

interface PlanSeed {
	readonly stretches?: number;
	readonly walkingMinutes?: number;
	readonly warmupMinutes?: number;
}

const planOf = (seed: PlanSeed = {}): ProgramPlan => ({
	exercises: new Map(),
	hipMobilityExerciseIds: new Set(),
	program: programOf(seed.warmupMinutes, 3, seed.walkingMinutes),
	sessions: seed.stretches === undefined ? [] : [sessionOf(seed.stretches)],
	volume: { frequency: new Map(), volume: new Map() }
});

describe('aerobicWeeklyMinutes', () => {
	it('складывает зал и ходьбу вне зала', () => {
		const plan = planOf({ walkingMinutes: 45, warmupMinutes: 5 });
		expect(aerobicWeeklyMinutes(plan)).toEqual([]);
	});

	it('молчит, когда зал закрывает норму сам', () => {
		expect(aerobicWeeklyMinutes(planOf({ warmupMinutes: 50 }))).toEqual([]);
	});

	it('ловит нехватку и печатает слагаемые', () => {
		const findings = aerobicWeeklyMinutes(planOf({ warmupMinutes: 5 }));
		expect(findings[0]?.message).toBe('зал 15 мин + ходьба 0 мин = 15 мин/нед');
	});

	it('ловит перебор и отсутствие разогрева в расписании', () => {
		expect(aerobicWeeklyMinutes(planOf({ warmupMinutes: 200 }))).toHaveLength(1);
		expect(aerobicWeeklyMinutes(planOf())).toHaveLength(1);
	});
});

describe('staticStretchEverySession', () => {
	it('молчит на трёх растяжках и говорит на двух', () => {
		expect(staticStretchEverySession(planOf({ stretches: 3 }))).toEqual([]);
		const findings = staticStretchEverySession(planOf({ stretches: 2 }));
		expect(findings[0]?.message).toBe('по занятиям: 2');
	});
});
