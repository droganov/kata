import { describe, expect, it } from 'vitest';

import type { Exercise, ExerciseRecord, Step } from './exercise.ts';

import {
	counterLinesOf,
	exerciseSubject,
	mainEquipmentIdsOf,
	stepModelOf,
	stepPredicatesOf,
	targetIdsOf
} from './exercise.ts';

const step = {
	active: ['t1'],
	id: 's1',
	oracles: [
		{
			counterModel: ['крен корпуса'],
			id: 'o1',
			model: ['корпус вертикален'],
			predicate: 'Корпус ровен'
		},
		{
			counterModel: ['таз уходит'],
			id: 'o2',
			model: ['таз под корпусом'],
			predicate: 'Таз на месте'
		}
	],
	title: 'Принять положение'
} as unknown as Step;

const exercise = {
	dose: '2×10',
	equipment: [
		{ id: 'body', role: 'main' },
		{ id: 'mat', role: 'auxiliary' }
	],
	id: 'e1',
	procedure: { id: 'p1', steps: [step] },
	slug: 'lunge',
	targets: [
		{ id: 't1', role: 'primary' },
		{ id: 't2', role: 'secondary' }
	]
} as unknown as Exercise;

const record = {
	bank: 'stretch',
	contourSlug: 'hip',
	contourTitle: 'бёдра',
	exercise
} as unknown as ExerciseRecord;

describe('exercise', () => {
	it('собирает контр-строки шага', () => {
		expect(counterLinesOf(step)).toEqual(['крен корпуса', 'таз уходит']);
	});

	it('даёт предикаты шага и модель шага с предикатами впереди', () => {
		expect(stepPredicatesOf(step)).toEqual(['Корпус ровен', 'Таз на месте']);
		expect(stepModelOf(step)).toEqual([
			'Корпус ровен',
			'Таз на месте',
			'корпус вертикален',
			'таз под корпусом'
		]);
	});

	it('берёт средства с ролью main', () => {
		expect(mainEquipmentIdsOf(exercise)).toEqual(['body']);
	});

	it('даёт идентификаторы целей и подпись записи', () => {
		expect([...targetIdsOf(exercise)]).toEqual(['t1', 't2']);
		expect(exerciseSubject(record)).toBe('stretch:lunge');
	});
});
