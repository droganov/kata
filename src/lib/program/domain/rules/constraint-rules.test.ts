import { describe, expect, it } from 'vitest';

import type { PlanConstraints, PlanExercise } from '../plan-exercise.ts';
import type { ProgramPlan } from '../program-plan.ts';
import type { CorePlane, HipPlane, Program, Slot } from '../program.ts';
import type { Session } from '../session.ts';

import { HIP_PLANE_RULE, LATERAL_RULE } from '../rotation.ts';
import { freeWeightLimit, sessionTimeBudget, slotDepth } from './constraint-rules.ts';

interface ExerciseSeed {
	readonly constraints?: Partial<PlanConstraints>;
	readonly hipPlane?: HipPlane;
	readonly id: string;
	readonly plane?: CorePlane;
}

interface PlanSeed {
	readonly hipPlanes?: readonly HipPlane[];
	readonly minutes?: readonly number[];
	readonly seeds?: readonly ExerciseSeed[];
	readonly slots?: readonly Slot[];
}

const FREE: PlanConstraints = {
	axial: false,
	free_weight: false,
	lumbar_ext: false,
	lumbar_flex: false
};
const BASE: Slot = { exercises: ['a'], id: 'base', kind: 'base', label: 'База' };
const OTHER_IDS = ['a', 'b', 'c', 'd', 'e', 'f'];

const anteriorSeedOf = (id: string): ExerciseSeed => ({ id, plane: 'anterior' });

const exerciseOf = (seed: ExerciseSeed): PlanExercise => ({
	constraints: { ...FREE, ...seed.constraints },
	dose: '3×12',
	hasProcedure: true,
	...(seed.hipPlane !== undefined && { hipPlane: seed.hipPlane }),
	id: seed.id,
	mode: 'loaded',
	name: seed.id,
	...(seed.plane !== undefined && { plane: seed.plane }),
	slug: seed.id,
	targets: []
});

const sessionOf = (minutes: number, at: number): Session => ({
	index: at + 1,
	minutes,
	program: 'program',
	sections: [],
	slug: `w1d${String(at + 1)}`,
	title: `Занятие ${String(at + 1)}`
});

const poolOf = (over: Partial<Slot>): Slot => ({
	allow_repeat: false,
	exercises: [],
	id: 'pool',
	kind: 'pool',
	label: 'Пул',
	pick: 1,
	...over
});

const planOf = (seed: PlanSeed = {}): ProgramPlan => {
	const program = {
		contraindications: {
			axial_load: true,
			free_weight_kg_max: 10,
			loaded_lumbar_extension: true,
			loaded_lumbar_flexion: true
		},
		...(seed.hipPlanes !== undefined && { hip_planes: seed.hipPlanes }),
		schedule: { rotation_weeks: 2, session_budget_min: 70, sessions_per_week: 3 },
		sections: [
			{
				bank: 'bank',
				id: 'strength',
				mode: 'loaded',
				slots: seed.slots ?? [BASE],
				slug: 'strength',
				title: 'Силовой'
			}
		],
		title: 'Программа'
	} as unknown as Program;
	return {
		exercises: new Map((seed.seeds ?? []).map((one) => [one.id, exerciseOf(one)])),
		hipMobilityExerciseIds: new Set(),
		program,
		sessions: (seed.minutes ?? []).map((minutes, at) => sessionOf(minutes, at)),
		volume: { frequency: new Map(), volume: new Map() }
	};
};

describe('freeWeightLimit', () => {
	it('молчит на снаряде в пределах и на тренажёре без веса', () => {
		const light = planOf({
			seeds: [{ constraints: { free_weight: true, kg_max: 10 }, id: 'a' }]
		});
		expect(freeWeightLimit(light)).toEqual([]);
		expect(freeWeightLimit(planOf({ seeds: [{ id: 'a' }] }))).toEqual([]);
	});

	it('ловит перевес и неизвестный предел', () => {
		const heavy = planOf({
			seeds: [{ constraints: { free_weight: true, kg_max: 20 }, id: 'a' }]
		});
		expect(freeWeightLimit(heavy)).toHaveLength(1);
		const unknown = planOf({ seeds: [{ constraints: { free_weight: true }, id: 'a' }] });
		expect(freeWeightLimit(unknown)).toHaveLength(1);
	});
});

describe('sessionTimeBudget', () => {
	it('молчит внутри бюджета', () => {
		expect(sessionTimeBudget(planOf({ minutes: [67, 68] }))).toEqual([]);
	});

	it('ловит короткое и длинное занятие', () => {
		expect(sessionTimeBudget(planOf({ minutes: [40] }))[0]?.message).toBe('40 мин');
		expect(sessionTimeBudget(planOf({ minutes: [90] }))).toHaveLength(1);
	});
});

describe('slotDepth', () => {
	it('не смотрит на базу и на пул с разрешёнными повторами', () => {
		expect(slotDepth(planOf({ seeds: [{ id: 'a' }] }))).toEqual([]);
		const loose = planOf({
			seeds: [{ id: 'a' }],
			slots: [poolOf({ allow_repeat: true, exercises: ['a'] })]
		});
		expect(slotDepth(loose)).toEqual([]);
	});

	it('требует глубины на всю ротацию', () => {
		const seeds = OTHER_IDS.map((id) => ({ id }));
		const deep = planOf({ seeds, slots: [poolOf({ exercises: OTHER_IDS })] });
		expect(slotDepth(deep)).toEqual([]);
		const thin = planOf({ seeds, slots: [poolOf({ exercises: ['a', 'b'] })] });
		const findings = slotDepth(thin);
		expect(findings.map((finding) => finding.rule)).toEqual(['E8 SLOT_DEPTH']);
		expect(findings[0]?.message).toBe('Пул: 2 кандидатов при нужных 6');
	});

	it('считает для боковой плоскости только небоковых кандидатов', () => {
		const seeds: readonly ExerciseSeed[] = [
			{ id: 'side', plane: 'lateral' },
			...OTHER_IDS.map((id) => anteriorSeedOf(id))
		];
		const slot = poolOf({ exercises: ['side', ...OTHER_IDS], pick: 2, rule: LATERAL_RULE });
		expect(slotDepth(planOf({ seeds, slots: [slot] }))).toEqual([]);
		const thin = poolOf({ exercises: ['side', 'a'], pick: 2, rule: LATERAL_RULE });
		expect(slotDepth(planOf({ seeds, slots: [thin] }))).toHaveLength(1);
	});

	it('требует кандидата на каждое направление сустава', () => {
		const seeds: readonly ExerciseSeed[] = [
			{ hipPlane: 'flexion', id: 'flex' },
			{ hipPlane: 'extension', id: 'ext' }
		];
		const hipPlanes: readonly HipPlane[] = ['flexion', 'extension'];
		const full = poolOf({ exercises: ['flex', 'ext'], rule: HIP_PLANE_RULE });
		expect(slotDepth(planOf({ hipPlanes, seeds, slots: [full] }))).toEqual([]);
		const partial = poolOf({ exercises: ['flex'], rule: HIP_PLANE_RULE });
		const findings = slotDepth(planOf({ hipPlanes, seeds, slots: [partial] }));
		expect(findings[0]?.message).toBe('Пул — направление без кандидатов: extension');
	});
});
