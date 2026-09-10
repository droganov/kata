import { describe, expect, it } from 'vitest';

import type { Exercise, ExerciseRecord, Procedure } from '../exercise.ts';
import type { ExerciseCheck } from './exercise-check.ts';

import {
	cycleIssues,
	distinctIssues,
	doseIssues,
	procedureFormIssues,
	sourceIssues,
	spineIssues
} from './procedure-rules.ts';

const exerciseOf = (dose: string): Exercise => ({ dose }) as unknown as Exercise;

const recordOf = (contourSlug: string, contourTitle: string): ExerciseRecord =>
	({ bank: 'stretch', contourSlug, contourTitle }) as unknown as ExerciseRecord;

const checkOf = (hasSource: boolean, shouldUseVerdicts: boolean): ExerciseCheck =>
	({ hasSource, shouldUseVerdicts }) as unknown as ExerciseCheck;

const messagesOf = (issues: readonly { readonly message: string }[]): readonly string[] =>
	issues.map((issue) => issue.message);

describe('procedure-rules', () => {
	it('требует id и steps в процедуре и не меньше двух шагов', () => {
		const good = { id: 'p1', steps: ['a', 'b'] } as unknown as Procedure;
		const short = { id: 'p1', steps: ['a'] } as unknown as Procedure;
		const extra = { id: 'p1', note: 'x', steps: ['a', 'b'] } as unknown as Procedure;
		expect(procedureFormIssues(good)).toEqual([]);
		expect(procedureFormIssues(short)).toHaveLength(1);
		expect(procedureFormIssues(extra)).toHaveLength(1);
	});

	it('ловит смену стороны без дозы «/сторона»', () => {
		const issues = cycleIssues(exerciseOf('3×10'), [
			'принять исходное положение',
			'повторить 10 раз',
			'перейти на другую сторону'
		]);
		expect(messagesOf(issues)).toContain('есть смена стороны, а доза без «/сторона»: 3×10');
	});

	it('требует шаг «Сменить направление» при дозе «в каждую сторону»', () => {
		const issues = cycleIssues(exerciseOf('по 8 в каждую сторону'), [
			'принять исходное положение',
			'повторить 8 раз'
		]);
		expect(messagesOf(issues)).toContain(
			'нет шага «Сменить направление» при дозе по 8 в каждую сторону'
		);
	});

	it('требует шаг повтора при повторной дозе и шаг удержания при секундной', () => {
		const reps = cycleIssues(exerciseOf('3×10'), ['принять исходное положение', 'подать таз']);
		const seconds = cycleIssues(exerciseOf('3×30с'), [
			'принять исходное положение',
			'подать таз'
		]);
		expect(messagesOf(reps)).toContain('нет шага повтора при повторной дозе');
		expect(messagesOf(seconds)).toContain('нет шага удержания при секундной дозе');
	});

	it('требует установку или исходное первым шагом и молчит на пустом списке', () => {
		const issues = cycleIssues(exerciseOf('3×10'), ['подать таз', 'повторить 10 раз']);
		expect(messagesOf(issues)).toContain('первый шаг не установка/исходное: подать таз');
		expect(cycleIssues(exerciseOf('3×10 повторов'), [])).toEqual([]);
	});

	it('видит доли минут в дозе как секунды', () => {
		expect(doseIssues(exerciseOf('5.5 мин'), ['Удержать 5 минут 30 секунд'])).toEqual([]);
		const issues = doseIssues(exerciseOf('5.5 мин'), ['Удержать 5 минут']);
		expect(messagesOf(issues)).toEqual([
			'число дозы 30 (5.5 мин) не встречается в title/predicate'
		]);
	});

	it('ловит повторяющиеся предикаты', () => {
		expect(distinctIssues(['а', 'а'])).toHaveLength(1);
		expect(distinctIssues(['а', 'б'])).toEqual([]);
	});

	it('требует «до нейтрали» в контуре разгибателей', () => {
		const bySlug = spineIssues(recordOf('erectors_hold', 'удержание'), ['поясница нейтральна']);
		const byTitle = spineIssues(recordOf('neck_extensors', 'Разгибатели шеи'), [
			'поясница нейтральна'
		]);
		const done = spineIssues(recordOf('erectors_hold', 'удержание'), [
			'поясница нейтральна до нейтрали'
		]);
		expect(messagesOf(bySlug)).toContain('контур разгибателей: нет «до нейтрали|до линии»');
		expect(messagesOf(byTitle)).toContain('контур разгибателей: нет «до нейтрали|до линии»');
		expect(done).toEqual([]);
	});

	it('требует источник только при работе с судьёй', () => {
		expect(sourceIssues(checkOf(false, false))).toEqual([]);
		expect(sourceIssues(checkOf(true, true))).toEqual([]);
		expect(sourceIssues(checkOf(false, true))).toHaveLength(1);
	});
});
