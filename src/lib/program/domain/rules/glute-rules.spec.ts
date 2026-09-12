import { describe, expect, it } from 'vitest';

import type { PlanExercise } from '../plan-exercise.ts';
import type { ProgramPlan } from '../program-plan.ts';
import type { Program } from '../program.ts';

import { PROGRAM_BASE } from '../../../../test/program-base.ts';
import { glutesInBase, glutesWeeklyVolume } from './glute-rules.ts';

interface PlanSeed {
	readonly dose?: string;
	readonly hasTargets?: boolean;
	readonly isDirect?: boolean;
	readonly volume?: number;
}

const exerciseOf = (dose: string, isDirect: boolean): PlanExercise => ({
	constraints: { axial: false, free_weight: false, lumbar_ext: false, lumbar_flex: false },
	dose,
	hasProcedure: true,
	id: 'a',
	mode: 'loaded',
	name: 'a',
	slug: 'a',
	targets: [{ group: 'glutes', role: isDirect ? 'primary' : 'secondary' }]
});

const programOf = (hasTargets: boolean): Program => ({
	...PROGRAM_BASE,
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
	title: 'Программа',
	...(hasTargets && { volume_targets: { glutes: { max: 22, min: 12 } } })
});

const planOf = (seed: PlanSeed = {}): ProgramPlan => {
	const exercise = exerciseOf(seed.dose ?? '3×12–15', seed.isDirect ?? true);
	return {
		exercises: new Map([[exercise.id, exercise]]),
		hipMobilityExerciseIds: new Set(),
		program: programOf(seed.hasTargets ?? true),
		sessions: [],
		volume: { frequency: new Map(), volume: new Map([['glutes', seed.volume ?? 15]]) }
	};
};

describe('glutesInBase', () => {
	it('молчит, когда в базе хватает прямых подходов', () => {
		expect(glutesInBase(planOf())).toEqual([]);
	});

	it('говорит, когда прямых подходов мало', () => {
		const findings = glutesInBase(planOf({ dose: '2×12–15' }));
		expect(findings.map((finding) => finding.rule)).toEqual(['E8 GLUTES_IN_BASE']);
		expect(findings[0]?.message).toBe('2 прямых подходов в базе');
	});

	it('не считает косвенную нагрузку прямой', () => {
		expect(glutesInBase(planOf({ isDirect: false }))).toHaveLength(1);
	});
});

describe('glutesWeeklyVolume', () => {
	it('молчит внутри коридора', () => {
		expect(glutesWeeklyVolume(planOf())).toEqual([]);
	});

	it('говорит выше и ниже коридора', () => {
		const above = glutesWeeklyVolume(planOf({ volume: 23.25 }));
		expect(above.map((finding) => finding.rule)).toEqual(['E1 GLUTES_VOLUME']);
		expect(above[0]?.message).toBe('23.3 подходов/нед, коридор 12–22');
		expect(glutesWeeklyVolume(planOf({ volume: 4 }))).toHaveLength(1);
	});

	it('молчит, когда коридор не задан', () => {
		expect(glutesWeeklyVolume(planOf({ hasTargets: false, volume: 99 }))).toEqual([]);
	});
});
