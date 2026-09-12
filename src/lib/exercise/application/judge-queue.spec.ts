import { describe, expect, it, vi } from 'vitest';

import type { ExerciseRecord } from '../domain/exercise.ts';
import type { Verdict } from '../domain/verdict.ts';
import type { ExerciseRepositories } from './exercise-repositories.ts';

import { EXERCISE_BASE } from '../../../test/exercise-base.ts';
import { uuidOfLabel } from '../../../test/uuid.ts';
import { judgeQueue } from './judge-queue.ts';

const hasher = { digest: (text: string): string => text };

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

const repositoriesOf = (
	verdicts: readonly Verdict[]
): Pick<ExerciseRepositories, 'exercises' | 'hasher' | 'verdicts'> => ({
	exercises: { readAll: () => records },
	hasher,
	verdicts: { readAll: () => verdicts, save: vi.fn() }
});

describe('judgeQueue', () => {
	it('отдаёт все контр-строки без вердиктов', () => {
		expect(judgeQueue(repositoriesOf([])).map((chunk) => chunk.line)).toEqual([
			'таз уходит',
			'таз качает'
		]);
	});

	it('пропускает строки с вердиктом «независима» и держит остальные', () => {
		const judged = judgeQueue(repositoriesOf([]));
		const verdicts: readonly Verdict[] = [
			{
				hash: judged[0]!.hash,
				id: uuidOfLabel('v1'),
				line: judged[0]!.line,
				oracle: uuidOfLabel('o1'),
				verdict: 'independent'
			},
			{
				hash: judged[1]!.hash,
				id: uuidOfLabel('v2'),
				line: judged[1]!.line,
				oracle: uuidOfLabel('o1'),
				verdict: 'negation'
			}
		];
		expect(judgeQueue(repositoriesOf(verdicts)).map((chunk) => chunk.line)).toEqual([
			'таз качает'
		]);
	});
});
