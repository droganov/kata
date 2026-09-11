import { describe, expect, it } from 'vitest';

import type { ExerciseRecord } from '../domain/exercise.ts';
import type { Verdict } from '../domain/verdict.ts';
import type { ExerciseRepositories } from './exercise-repositories.ts';

import { judgeQueue } from './judge-queue.ts';

const hasher = { digest: (text: string): string => text };

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

const repositoriesOf = (verdicts: readonly Verdict[]): ExerciseRepositories =>
	({
		exercises: { readAll: () => records },
		hasher,
		verdicts: { readAll: () => verdicts }
	}) as unknown as ExerciseRepositories;

describe('judgeQueue', () => {
	it('отдаёт все контр-строки без вердиктов', () => {
		expect(judgeQueue(repositoriesOf([])).map((chunk) => chunk.line)).toEqual([
			'таз уходит',
			'таз качает'
		]);
	});

	it('пропускает строки с вердиктом «независима» и держит остальные', () => {
		const judged = judgeQueue(repositoriesOf([]));
		const verdicts = [
			{
				hash: judged[0]!.hash,
				id: 'v1',
				line: judged[0]!.line,
				oracle: 'o1',
				verdict: 'independent'
			},
			{
				hash: judged[1]!.hash,
				id: 'v2',
				line: judged[1]!.line,
				oracle: 'o1',
				verdict: 'negation'
			}
		] as unknown as readonly Verdict[];
		expect(judgeQueue(repositoriesOf(verdicts)).map((chunk) => chunk.line)).toEqual([
			'таз качает'
		]);
	});
});
