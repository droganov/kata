import { describe, expect, it } from 'vitest';

import type { ExerciseReport } from '../application/validate-exercises.ts';

import { criticExitCode, criticLines } from './exercise-critic-view.ts';

const reportOf = (findings: ExerciseReport['findings']): ExerciseReport => ({
	failureCount: findings.length,
	findings,
	recordCount: 2,
	verdictCount: 3
});

describe('exercise-critic-view', () => {
	it('печатает шапку и итог без провалов', () => {
		const report = reportOf([]);
		expect(criticLines(report)).toEqual(['ЗАПИСЕЙ: 2  ВЕРДИКТОВ: 3', 'ПРОВАЛЕНО: 0']);
		expect(criticExitCode(report)).toBe(0);
	});

	it('печатает провалы, счёт по правилам и код выхода 1', () => {
		const report = reportOf([
			{ message: 'шаг 1: форма шага', rule: 'O1 PRESENT', subject: 'stretch:frog' },
			{ message: 'шаг 2: форма шага', rule: 'O1 PRESENT', subject: 'stretch:frog' },
			{ message: 'нет источника', rule: 'O5 SOURCE', subject: 'cardio:row' }
		]);
		expect(criticLines(report)).toEqual([
			'ЗАПИСЕЙ: 2  ВЕРДИКТОВ: 3',
			'  FAIL  O1 PRESENT  stretch:frog  шаг 1: форма шага',
			'  FAIL  O1 PRESENT  stretch:frog  шаг 2: форма шага',
			'  FAIL  O5 SOURCE  cardio:row  нет источника',
			'  O1 PRESENT: 2',
			'  O5 SOURCE: 1',
			'ПРОВАЛЕНО: 3'
		]);
		expect(criticExitCode(report)).toBe(1);
	});
});
