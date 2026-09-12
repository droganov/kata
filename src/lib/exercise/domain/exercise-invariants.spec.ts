import { describe, expect, it } from 'vitest';

import type { Exercise, Oracle } from './exercise.ts';

import { EXERCISE_BASE } from '../../../test/exercise-base.ts';
import { uuidOfLabel } from '../../../test/uuid.ts';
import { exerciseInvariants } from './exercise-invariants.ts';

const oracle = (id: string): Oracle => ({
	counterModel: ['таз уходит'],
	id: uuidOfLabel(id),
	model: ['таз под корпусом'],
	predicate: 'Таз на месте'
});

const exerciseOf = (patch: Partial<Exercise>): Exercise => ({
	...EXERCISE_BASE,
	equipment: [{ id: uuidOfLabel('body'), role: 'main' }],
	id: uuidOfLabel('e1'),
	procedure: {
		id: uuidOfLabel('p1'),
		steps: [
			{
				active: [uuidOfLabel('t1')],
				id: uuidOfLabel('s1'),
				oracles: [oracle('o1')],
				title: 'Принять положение'
			},
			{ active: [], id: uuidOfLabel('s2'), oracles: [oracle('o2')], title: 'Вернуть таз' }
		]
	},
	targets: [{ id: uuidOfLabel('t1'), role: 'primary' }],
	...patch
});

const rulesOf = (exercise: Exercise): readonly string[] =>
	exerciseInvariants(exercise).map((issue) => issue.rule);

describe('exerciseInvariants', () => {
	it('молчит на целом агрегате', () => {
		expect(exerciseInvariants(exerciseOf({}))).toEqual([]);
	});

	it('ловит повтор идентификаторов внутри агрегата', () => {
		const exercise = exerciseOf({
			procedure: {
				id: uuidOfLabel('p1'),
				steps: [
					{
						active: [],
						id: uuidOfLabel('s1'),
						oracles: [oracle('s1')],
						title: 'Принять положение'
					},
					{
						active: [],
						id: uuidOfLabel('s2'),
						oracles: [oracle('o2')],
						title: 'Вернуть таз'
					}
				]
			}
		});
		expect(rulesOf(exercise)).toContain('A1 IDS');
	});

	it('требует ровно одно средство с ролью main', () => {
		const exercise = exerciseOf({
			equipment: [{ id: uuidOfLabel('body'), role: 'auxiliary' }]
		});
		expect(rulesOf(exercise)).toContain('A2 MAIN');
	});

	it('ловит повторы средств и целей', () => {
		const gear = rulesOf(
			exerciseOf({
				equipment: [
					{ id: uuidOfLabel('body'), role: 'main' },
					{ id: uuidOfLabel('body'), role: 'auxiliary' }
				]
			})
		);
		const targets = rulesOf(
			exerciseOf({
				targets: [
					{ id: uuidOfLabel('t1'), role: 'primary' },
					{ id: uuidOfLabel('t1'), role: 'secondary' }
				]
			})
		);
		expect(gear).toContain('A3 REFS');
		expect(targets).toContain('A3 REFS');
	});

	it('требует active внутри целей упражнения', () => {
		const exercise = exerciseOf({ targets: [{ id: uuidOfLabel('t9'), role: 'primary' }] });
		expect(rulesOf(exercise)).toContain('A4 ACTIVE');
	});
});
