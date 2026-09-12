import { describe, expect, it } from 'vitest';

import type { ExerciseRecord } from '../domain/exercise.ts';

import { EXERCISE_BASE } from '../../../test/exercise-base.ts';
import { uuidOfLabel } from '../../../test/uuid.ts';
import { counterLinesOf } from './counter-lines.ts';

const hasher = { digest: (text: string): string => `hash(${text})` };

const records: readonly ExerciseRecord[] = [
	{
		bank: 'stretch',
		contourSlug: 'hip',
		contourTitle: 'бёдра',
		exercise: {
			...EXERCISE_BASE,
			id: uuidOfLabel('e1'),
			procedure: {
				id: uuidOfLabel('p1'),
				steps: [
					{
						active: [],
						id: uuidOfLabel('s1'),
						oracles: [
							{
								counterModel: ['таз уходит', 'таз качает'],
								id: uuidOfLabel('o1'),
								model: ['таз под корпусом'],
								predicate: 'Таз на месте'
							},
							{
								counterModel: ['корпус кренится'],
								id: uuidOfLabel('o2'),
								model: ['корпус вертикален'],
								predicate: 'Корпус ровен'
							}
						],
						title: 'Принять положение'
					}
				]
			},
			slug: 'lunge'
		}
	}
];

describe('counterLinesOf', () => {
	it('даёт по чанку на контр-строку с моделью шага целиком', () => {
		const lines = counterLinesOf(records, hasher);
		expect(lines.map((line) => line.line)).toEqual([
			'таз уходит',
			'таз качает',
			'корпус кренится'
		]);
		expect(lines[0]).toEqual({
			exerciseSlug: 'lunge',
			hash: 'hash(Таз на месте\nТаз на месте\nКорпус ровен\nтаз под корпусом\nкорпус вертикален\nтаз уходит)',
			line: 'таз уходит',
			oracleId: uuidOfLabel('o1'),
			predicate: 'Таз на месте',
			stepModel: ['таз под корпусом', 'корпус вертикален'],
			stepPredicates: ['Таз на месте', 'Корпус ровен'],
			stepTitle: 'Принять положение'
		});
	});
});
