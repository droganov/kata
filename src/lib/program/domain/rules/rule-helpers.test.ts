import { describe, expect, it } from 'vitest';

import type { PlanExercise } from '../plan-exercise.ts';
import type { ProgramPlan } from '../program-plan.ts';
import type { Program, Section } from '../program.ts';
import type { Session } from '../session.ts';

import {
	allCandidatesOf,
	baseExercisesOf,
	candidatesOf,
	oneDecimal,
	sectionsBeforeLoad,
	sessionExercisesWithMode
} from './rule-helpers.ts';

const exerciseOf = (id: string): PlanExercise => ({
	constraints: { axial: false, free_weight: false, lumbar_ext: false, lumbar_flex: false },
	dose: '3×12',
	hasProcedure: true,
	id,
	mode: 'loaded',
	name: id,
	slug: id,
	targets: []
});

const WARMUP: Section = {
	bank: 'bank',
	id: 'warmup',
	mode: 'dynamic',
	slots: [
		{ allow_repeat: true, exercises: ['w'], id: 'wp', kind: 'pool', label: 'Пул', pick: 1 }
	],
	slug: 'warmup',
	title: 'Разминка'
};
const STRENGTH: Section = {
	bank: 'bank',
	id: 'strength',
	mode: 'loaded',
	slots: [
		{ exercises: ['a'], id: 'base', kind: 'base', label: 'База' },
		{ allow_repeat: false, exercises: ['b'], id: 'pool', kind: 'pool', label: 'Пул', pick: 1 }
	],
	slug: 'strength',
	title: 'Силовой'
};

const PROGRAM = { sections: [WARMUP, STRENGTH], title: 'Программа' } as unknown as Program;

const PLAN: ProgramPlan = {
	exercises: new Map([
		['a', exerciseOf('a')],
		['b', exerciseOf('b')],
		['w', exerciseOf('w')]
	]),
	hipMobilityExerciseIds: new Set(),
	program: PROGRAM,
	sessions: [],
	volume: { frequency: new Map(), volume: new Map() }
};

const SESSION: Session = {
	index: 1,
	minutes: 60,
	program: 'program',
	sections: [
		{
			mode: 'loaded',
			section: 'strength',
			slots: [{ exercises: [exerciseOf('a')], kind: 'base', label: 'База', slot: 'base' }],
			slug: 'strength',
			title: 'Силовой'
		}
	],
	slug: 'w1d1',
	title: 'Занятие 1'
};

describe('rule-helpers', () => {
	it('собирает кандидатов всей программы, раздела и только базы', () => {
		expect(allCandidatesOf(PLAN).map((item) => item.id)).toEqual(['w', 'a', 'b']);
		expect(candidatesOf(PLAN, 'loaded').map((item) => item.id)).toEqual(['a', 'b']);
		expect(baseExercisesOf(PLAN, 'loaded').map((item) => item.id)).toEqual(['a']);
	});

	it('перечисляет разделы до силового', () => {
		expect(sectionsBeforeLoad(PROGRAM).map((section) => section.slug)).toEqual(['warmup']);
		expect(sectionsBeforeLoad({ sections: [WARMUP] } as unknown as Program)).toEqual([]);
	});

	it('берёт упражнения занятия по режиму раздела', () => {
		expect(sessionExercisesWithMode(SESSION, 'loaded').map((item) => item.id)).toEqual(['a']);
		expect(sessionExercisesWithMode(SESSION, 'cardio')).toEqual([]);
	});

	it('печатает число с одним знаком', () => {
		expect(oneDecimal(23.25)).toBe('23.3');
	});
});
