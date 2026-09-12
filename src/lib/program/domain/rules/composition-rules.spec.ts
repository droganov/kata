import { describe, expect, it } from 'vitest';

import type { PlanExercise } from '../plan-exercise.ts';
import type { ProgramPlan } from '../program-plan.ts';
import type { Program, Progression } from '../program.ts';

import { PROGRAM_BASE } from '../../../../test/program-base.ts';
import {
	groupVolumeCorridor,
	majorGroupFrequency,
	minSetsPerExercise,
	progressionDeclared
} from './composition-rules.ts';

interface PlanSeed {
	readonly dose?: string;
	readonly frequency?: readonly (readonly [string, number])[];
	readonly progression?: Progression;
	readonly volume?: readonly (readonly [string, number])[];
}

const MAJORS = ['glutes', 'quads', 'hamstrings', 'back', 'chest', 'delts'];
const FULL_PROGRESSION: Progression = {
	base: 'двойная',
	isometric: 'i',
	pool: 'дневник',
	stop_rule: 's'
};

const frequencyOf = (rare: string | undefined): readonly (readonly [string, number])[] =>
	MAJORS.map((group) => [group, group === rare ? 1 : 3]);

const exerciseOf = (dose: string): PlanExercise => ({
	constraints: { axial: false, free_weight: false, lumbar_ext: false, lumbar_flex: false },
	dose,
	hasProcedure: true,
	id: 'a',
	mode: 'loaded',
	name: 'a',
	slug: 'a',
	targets: []
});

const planOf = (seed: PlanSeed = {}): ProgramPlan => {
	const exercise = exerciseOf(seed.dose ?? '3×12');
	const program: Program = {
		...PROGRAM_BASE,
		progression: seed.progression ?? FULL_PROGRESSION,
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
		volume_targets: { glutes: { max: 22, min: 12 } }
	};
	return {
		exercises: new Map([[exercise.id, exercise]]),
		hipMobilityExerciseIds: new Set(),
		program,
		sessions: [],
		volume: {
			frequency: new Map(seed.frequency ?? frequencyOf(undefined)),
			volume: new Map(seed.volume ?? [['glutes', 15]])
		}
	};
};

describe('groupVolumeCorridor', () => {
	it('молчит, когда все группы в коридоре', () => {
		expect(groupVolumeCorridor(planOf())).toEqual([]);
	});

	it('перечисляет группы вне коридора с числами', () => {
		const above = groupVolumeCorridor(planOf({ volume: [['glutes', 23.25]] }));
		expect(above[0]?.message).toBe('glutes 23.3 нужно 12–22');
		expect(groupVolumeCorridor(planOf({ volume: [['glutes', 2]] }))).toHaveLength(1);
	});
});

describe('majorGroupFrequency', () => {
	it('молчит, когда крупные группы нагружены дважды в неделю', () => {
		expect(majorGroupFrequency(planOf())).toEqual([]);
	});

	it('перечисляет редкие группы', () => {
		const findings = majorGroupFrequency(planOf({ frequency: frequencyOf('delts') }));
		expect(findings[0]?.message).toBe('delts 1.0×/нед');
	});
});

describe('minSetsPerExercise', () => {
	it('молчит на двух подходах и говорит на одном', () => {
		expect(minSetsPerExercise(planOf({ dose: '2×15' }))).toEqual([]);
		expect(minSetsPerExercise(planOf({ dose: '15' }))).toHaveLength(1);
	});
});

describe('progressionDeclared', () => {
	it('молчит на описанной прогрессии и говорит на пустой', () => {
		expect(progressionDeclared(planOf())).toEqual([]);
		const noBase = planOf({ progression: { ...FULL_PROGRESSION, base: '' } });
		expect(progressionDeclared(noBase)).toHaveLength(1);
		const noPool = planOf({ progression: { ...FULL_PROGRESSION, pool: '' } });
		expect(progressionDeclared(noPool)).toHaveLength(1);
	});
});
