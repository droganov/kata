import { describe, expect, it } from 'vitest';

import type { Exercise, ExerciseRecord, Step } from './exercise.ts';

import { EXERCISE_BASE } from '../../../test/exercise-base.ts';
import { uuidOfLabel } from '../../../test/uuid.ts';
import {
	counterLinesOf,
	exerciseSubject,
	mainEquipmentIdsOf,
	stepModelOf,
	stepPredicatesOf,
	targetIdsOf
} from './exercise.ts';

const step: Step = {
	active: [uuidOfLabel('t1')],
	id: uuidOfLabel('s1'),
	oracles: [
		{
			counterModel: ['крен корпуса'],
			id: uuidOfLabel('o1'),
			model: ['корпус вертикален'],
			predicate: 'Корпус ровен'
		},
		{
			counterModel: ['таз уходит'],
			id: uuidOfLabel('o2'),
			model: ['таз под корпусом'],
			predicate: 'Таз на месте'
		}
	],
	title: 'Принять положение'
};

const exercise: Exercise = {
	...EXERCISE_BASE,
	dose: '2×10',
	equipment: [
		{ id: uuidOfLabel('body'), role: 'main' },
		{ id: uuidOfLabel('mat'), role: 'auxiliary' }
	],
	id: uuidOfLabel('e1'),
	procedure: { id: uuidOfLabel('p1'), steps: [step] },
	slug: 'lunge',
	targets: [
		{ id: uuidOfLabel('t1'), role: 'primary' },
		{ id: uuidOfLabel('t2'), role: 'secondary' }
	]
};

const record: ExerciseRecord = {
	bank: 'stretch',
	contourSlug: 'hip',
	contourTitle: 'бёдра',
	exercise
};

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
		expect(mainEquipmentIdsOf(exercise)).toEqual([uuidOfLabel('body')]);
	});

	it('даёт идентификаторы целей и подпись записи', () => {
		expect([...targetIdsOf(exercise)]).toEqual([uuidOfLabel('t1'), uuidOfLabel('t2')]);
		expect(exerciseSubject(record)).toBe('stretch:lunge');
	});
});
