import { describe, expect, it } from 'vitest';

import type { PlanExercise } from '../plan-exercise.ts';
import type { ProgramPlan } from '../program-plan.ts';
import type { Program, SectionMode } from '../program.ts';

import { goalsChecked, sectionModeMatches } from './structure-rules.ts';

const exerciseOf = (id: string, mode: SectionMode): PlanExercise => ({
	constraints: { axial: false, free_weight: false, lumbar_ext: false, lumbar_flex: false },
	dose: '3×12',
	hasProcedure: true,
	id,
	mode,
	name: id,
	slug: id,
	targets: []
});

const programOf = (primary: readonly string[]): Program =>
	({
		goals: { primary, secondary: [] },
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
		title: 'Программа'
	}) as unknown as Program;

const planOf = (program: Program, exercise: PlanExercise): ProgramPlan => ({
	exercises: new Map([[exercise.id, exercise]]),
	hipMobilityExerciseIds: new Set(),
	program,
	sessions: [],
	volume: { frequency: new Map(), volume: new Map() }
});

describe('sectionModeMatches', () => {
	it('молчит, когда режим позиции совпадает с режимом раздела', () => {
		const plan = planOf(programOf([]), exerciseOf('a', 'loaded'));
		expect(sectionModeMatches(plan)).toEqual([]);
	});

	it('ловит чужой режим', () => {
		const plan = planOf(programOf([]), exerciseOf('a', 'cardio'));
		const findings = sectionModeMatches(plan);
		expect(findings.map((finding) => finding.rule)).toEqual(['E8 SECTION_MODE']);
		expect(findings[0]?.message).toBe('strength: a (cardio)');
	});
});

describe('goalsChecked', () => {
	it('молчит на целях, у которых есть проверки', () => {
		const program = programOf(['glutes', 'hip_mobility']);
		const plan = planOf(program, exerciseOf('a', 'loaded'));
		expect(goalsChecked(plan)).toEqual([]);
	});

	it('ловит цель без проверок', () => {
		const program = programOf(['telepathy']);
		const plan = planOf(program, exerciseOf('a', 'loaded'));
		const findings = goalsChecked(plan);
		expect(findings[0]?.message).toBe('первичные цели без проверок: telepathy');
	});
});
