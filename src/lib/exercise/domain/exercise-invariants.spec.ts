import { describe, expect, it } from 'vitest';

import type { Exercise } from './exercise.ts';

import { exerciseInvariants } from './exercise-invariants.ts';

const oracle = (id: string): Record<string, unknown> => ({
	counterModel: ['таз уходит'],
	id,
	model: ['таз под корпусом'],
	predicate: 'Таз на месте'
});

const exerciseOf = (patch: Record<string, unknown>): Exercise =>
	({
		equipment: [{ id: 'body', role: 'main' }],
		id: 'e1',
		procedure: {
			id: 'p1',
			steps: [
				{ active: ['t1'], id: 's1', oracles: [oracle('o1')], title: 'Принять положение' },
				{ active: [], id: 's2', oracles: [oracle('o2')], title: 'Вернуть таз' }
			]
		},
		targets: [{ id: 't1', role: 'primary' }],
		...patch
	}) as unknown as Exercise;

const rulesOf = (exercise: Exercise): readonly string[] =>
	exerciseInvariants(exercise).map((issue) => issue.rule);

describe('exerciseInvariants', () => {
	it('молчит на целом агрегате', () => {
		expect(exerciseInvariants(exerciseOf({}))).toEqual([]);
	});

	it('ловит повтор идентификаторов внутри агрегата', () => {
		const exercise = exerciseOf({
			procedure: {
				id: 'p1',
				steps: [
					{ active: [], id: 's1', oracles: [oracle('s1')], title: 'Принять положение' },
					{ active: [], id: 's2', oracles: [oracle('o2')], title: 'Вернуть таз' }
				]
			}
		});
		expect(rulesOf(exercise)).toContain('A1 IDS');
	});

	it('требует ровно одно средство с ролью main', () => {
		expect(rulesOf(exerciseOf({ equipment: [{ id: 'body', role: 'auxiliary' }] }))).toContain(
			'A2 MAIN'
		);
	});

	it('ловит повторы средств и целей', () => {
		const gear = rulesOf(
			exerciseOf({
				equipment: [
					{ id: 'body', role: 'main' },
					{ id: 'body', role: 'auxiliary' }
				]
			})
		);
		const targets = rulesOf(
			exerciseOf({
				targets: [
					{ id: 't1', role: 'primary' },
					{ id: 't1', role: 'secondary' }
				]
			})
		);
		expect(gear).toContain('A3 REFS');
		expect(targets).toContain('A3 REFS');
	});

	it('требует active внутри целей упражнения', () => {
		expect(rulesOf(exerciseOf({ targets: [{ id: 't9', role: 'primary' }] }))).toContain(
			'A4 ACTIVE'
		);
	});
});
