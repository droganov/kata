import { describe, expect, it } from 'vitest';

import type { ExerciseRecord } from '../domain/exercise.ts';

import { counterLinesOf } from './counter-lines.ts';

const hasher = { digest: (text: string): string => `hash(${text})` };

const records = [
	{
		bank: 'stretch',
		contourSlug: 'hip',
		contourTitle: 'бёдра',
		exercise: {
			id: 'e1',
			procedure: {
				id: 'p1',
				steps: [
					{
						active: [],
						id: 's1',
						oracles: [
							{
								counterModel: ['таз уходит', 'таз качает'],
								id: 'o1',
								model: ['таз под корпусом'],
								predicate: 'Таз на месте'
							},
							{
								counterModel: ['корпус кренится'],
								id: 'o2',
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
] as unknown as readonly ExerciseRecord[];

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
			oracleId: 'o1',
			predicate: 'Таз на месте',
			stepModel: ['таз под корпусом', 'корпус вертикален'],
			stepPredicates: ['Таз на месте', 'Корпус ровен'],
			stepTitle: 'Принять положение'
		});
	});
});
