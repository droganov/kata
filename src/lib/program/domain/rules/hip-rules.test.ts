import { describe, expect, it } from 'vitest';

import type { PlanExercise } from '../plan-exercise.ts';
import type { ProgramPlan } from '../program-plan.ts';
import type { HipPlane, Program, Section, SectionMode, Slot } from '../program.ts';
import type { Session } from '../session.ts';

import {
	dynamicHipBeforeLoad,
	hipPlanesCovered,
	hipStretchMethod,
	hipStretchPerSession,
	noLongHoldBeforeLoad,
	staticHipAfterLoad
} from './hip-rules.ts';

interface ExerciseSeed {
	readonly dose?: string;
	readonly goal?: string;
	readonly hasProcedure?: boolean;
	readonly id: string;
	readonly mode: SectionMode;
}

interface PlanSeed {
	readonly beforeLoad?: readonly Slot[];
	readonly hipPlanes?: readonly HipPlane[];
	readonly seeds?: readonly ExerciseSeed[];
	readonly stretchBase?: readonly string[];
	readonly stretchPlanes?: readonly (HipPlane | undefined)[];
}

const exerciseOf = (seed: ExerciseSeed): PlanExercise => ({
	constraints: { axial: false, free_weight: false, lumbar_ext: false, lumbar_flex: false },
	dose: seed.dose ?? '3×12',
	hasProcedure: seed.hasProcedure ?? true,
	...(seed.goal !== undefined && { goal: seed.goal }),
	id: seed.id,
	mode: seed.mode,
	name: seed.id,
	slug: seed.id,
	targets: []
});

const sectionOf = (mode: SectionMode, slots: readonly Slot[]): Section => ({
	bank: 'bank',
	id: mode,
	mode,
	slots,
	slug: mode,
	title: mode
});

const stretchSessionOf = (planes: readonly (HipPlane | undefined)[]): Session => ({
	index: 1,
	minutes: 60,
	program: 'program',
	sections: [
		{
			mode: 'static_stretch',
			section: 'stretch',
			slots: [
				{
					exercises: planes.map((hipPlane, at) => ({
						...exerciseOf({ id: `st${String(at)}`, mode: 'static_stretch' }),
						...(hipPlane !== undefined && { hipPlane })
					})),
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

const HIP_POOL: Slot = {
	allow_repeat: true,
	exercises: ['hip'],
	id: 'hip-pool',
	kind: 'pool',
	label: 'Бёдра',
	pick: 1
};

const planOf = (seed: PlanSeed = {}): ProgramPlan => {
	const stretchSlots: readonly Slot[] =
		seed.stretchBase === undefined
			? []
			: [{ exercises: seed.stretchBase, id: 'base', kind: 'base', label: 'База' }];
	const program = {
		...(seed.hipPlanes !== undefined && { hip_planes: seed.hipPlanes }),
		sections: [
			sectionOf('dynamic', seed.beforeLoad ?? []),
			sectionOf('loaded', []),
			sectionOf('static_stretch', stretchSlots)
		],
		title: 'Программа'
	} as unknown as Program;
	return {
		exercises: new Map((seed.seeds ?? []).map((one) => [one.id, exerciseOf(one)])),
		hipMobilityExerciseIds: new Set(['hip']),
		program,
		sessions: seed.stretchPlanes === undefined ? [] : [stretchSessionOf(seed.stretchPlanes)],
		volume: { frequency: new Map(), volume: new Map() }
	};
};

describe('dynamicHipBeforeLoad', () => {
	it('молчит, когда до силового есть динамика бедра', () => {
		const plan = planOf({ beforeLoad: [HIP_POOL], seeds: [{ id: 'hip', mode: 'dynamic' }] });
		expect(dynamicHipBeforeLoad(plan)).toEqual([]);
	});

	it('говорит, когда слот пуст, не про бедро, не динамика или pick нулевой', () => {
		expect(dynamicHipBeforeLoad(planOf({ beforeLoad: [HIP_POOL] }))).toHaveLength(1);
		const wrongMode = planOf({
			beforeLoad: [HIP_POOL],
			seeds: [{ id: 'hip', mode: 'static_stretch' }]
		});
		expect(dynamicHipBeforeLoad(wrongMode)).toHaveLength(1);
		const otherJoint = planOf({
			beforeLoad: [{ ...HIP_POOL, exercises: ['knee'] }],
			seeds: [{ id: 'knee', mode: 'dynamic' }]
		});
		expect(dynamicHipBeforeLoad(otherJoint)).toHaveLength(1);
		const zeroPick = planOf({
			beforeLoad: [{ ...HIP_POOL, pick: 0 }],
			seeds: [{ id: 'hip', mode: 'dynamic' }]
		});
		expect(dynamicHipBeforeLoad(zeroPick)).toHaveLength(1);
	});
});

describe('staticHipAfterLoad и hipStretchMethod', () => {
	it('молчит на двух базовых растяжках бедра с процедурой', () => {
		const plan = planOf({
			seeds: [
				{ goal: 'hip_mobility', id: 'a', mode: 'static_stretch' },
				{ goal: 'hip_mobility', id: 'b', mode: 'static_stretch' }
			],
			stretchBase: ['a', 'b']
		});
		expect(staticHipAfterLoad(plan)).toEqual([]);
		expect(hipStretchMethod(plan)).toEqual([]);
	});

	it('говорит, когда растяжек мало или у них нет процедуры', () => {
		const plan = planOf({
			seeds: [
				{ goal: 'hip_mobility', hasProcedure: false, id: 'a', mode: 'static_stretch' },
				{ id: 'c', mode: 'static_stretch' }
			],
			stretchBase: ['a', 'c']
		});
		expect(staticHipAfterLoad(plan)).toHaveLength(1);
		expect(hipStretchMethod(plan)).toHaveLength(1);
	});
});

describe('noLongHoldBeforeLoad', () => {
	it('молчит на короткой динамике и говорит на длинном удержании', () => {
		const slot: Slot = { exercises: ['w'], id: 'base', kind: 'base', label: 'База' };
		const short = planOf({ beforeLoad: [slot], seeds: [{ id: 'w', mode: 'dynamic' }] });
		expect(noLongHoldBeforeLoad(short)).toEqual([]);
		const long = planOf({
			beforeLoad: [slot],
			seeds: [{ dose: '90с × 2', id: 'w', mode: 'static_stretch' }]
		});
		expect(noLongHoldBeforeLoad(long)).toHaveLength(1);
	});
});

describe('hipPlanesCovered и hipStretchPerSession', () => {
	it('молчит, когда все направления покрыты и растяжек хватает', () => {
		const plan = planOf({
			hipPlanes: ['flexion', 'extension'],
			stretchPlanes: ['flexion', 'extension', 'flexion']
		});
		expect(hipPlanesCovered(plan)).toEqual([]);
		expect(hipStretchPerSession(plan)).toEqual([]);
	});

	it('говорит о непокрытом направлении и о нехватке растяжек в занятии', () => {
		const plan = planOf({
			hipPlanes: ['flexion', 'extension'],
			stretchPlanes: ['flexion', undefined]
		});
		expect(hipPlanesCovered(plan)[0]?.message).toBe('не покрыто: extension');
		expect(hipStretchPerSession(plan)[0]?.message).toBe('по занятиям: 1');
	});
});
