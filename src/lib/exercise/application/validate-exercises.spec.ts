import { describe, expect, it, vi } from 'vitest';

import type { ExerciseRecord } from '../domain/exercise.ts';
import type { Verdict } from '../domain/verdict.ts';
import type { ExerciseRepositories } from './exercise-repositories.ts';

import { EXERCISE_BASE } from '../../../test/exercise-base.ts';
import { uuidOfLabel } from '../../../test/uuid.ts';
import { uuidOf } from '../../shared/uuid.ts';
import { verdictHashText } from '../domain/verdict.ts';
import { counterLinesOf } from './counter-lines.ts';
import { validateExercises } from './validate-exercises.ts';

const TARGET = uuidOf('01a0889d-0000-7000-8000-000000000001');
const BODY = uuidOf('01a0889d-0000-7000-8000-000000000010');
const SOURCE = uuidOf('01a0889d-0000-7000-8000-000000000020');

const hasher = { digest: (text: string): string => text };

const recordOf = (): ExerciseRecord => ({
	bank: 'stretch',
	contourSlug: 'hip',
	contourTitle: 'бёдра',
	exercise: {
		...EXERCISE_BASE,
		dose: '3×10',
		equipment: [{ id: BODY, role: 'main' }],
		id: uuidOfLabel('e1'),
		procedure: {
			id: uuidOfLabel('p1'),
			steps: [
				{
					active: [],
					id: uuidOfLabel('s1'),
					oracles: [
						{
							counterModel: ['таз уходит вперёд'],
							id: uuidOfLabel('o1'),
							model: ['таз под корпусом'],
							predicate: 'Таз на месте'
						}
					],
					title: 'Принять исходное положение'
				},
				{
					active: [TARGET],
					id: uuidOfLabel('s2'),
					oracles: [
						{
							counterModel: ['таз качает в конце подхода'],
							id: uuidOfLabel('o2'),
							model: ['таз под корпусом на счёт 10'],
							predicate: 'Таз неподвижен'
						}
					],
					title: 'Повторить 10 раз'
				}
			]
		},
		slug: 'lunge',
		source: SOURCE,
		targets: [{ id: TARGET, role: 'primary' }]
	}
});

const verdictsFor = (records: readonly ExerciseRecord[]): Verdict[] =>
	counterLinesOf(records, hasher).map((counter, at) => ({
		hash: counter.hash,
		id: uuidOfLabel(`v${String(at)}`),
		line: counter.line,
		oracle: counter.oracleId,
		verdict: 'independent'
	}));

const repositoriesOf = (
	records: readonly ExerciseRecord[],
	verdicts: readonly Verdict[]
): ExerciseRepositories => ({
	catalog: {
		readEquipment: () => [
			{ canonEn: 'Bodyweight', id: BODY, kind: 'body' as const, name: 'Тело', slug: 'body' }
		],
		readTargets: () => [
			{
				id: TARGET,
				kind: 'muscle' as const,
				latin: 'Iliopsoas',
				name: 'Подвздошно-поясничная',
				slug: 'iliopsoas',
				zone: 'hip'
			}
		]
	},
	exercises: { readAll: () => records },
	hasher,
	sources: {
		readAll: () => [{ exercise: uuidOfLabel('e1'), id: SOURCE, title: 'NASM' }]
	},
	verdicts: { readAll: () => verdicts, save: vi.fn() }
});

const rulesOf = (records: readonly ExerciseRecord[], verdicts: readonly Verdict[]): string[] => [
	...new Set(
		validateExercises(repositoriesOf(records, verdicts)).findings.map(
			(finding) => finding.rule.split(' ', 1)[0] ?? ''
		)
	)
];

describe('validateExercises', () => {
	it('считает записи, вердикты и провалы', () => {
		const records = [recordOf()];
		const report = validateExercises(repositoriesOf(records, verdictsFor(records)));
		expect(report.recordCount).toBe(1);
		expect(report.verdictCount).toBe(2);
		expect(report.failureCount).toBe(report.findings.length);
		expect(report.findings.every((finding) => finding.subject === 'stretch:lunge')).toBe(true);
	});

	it('не жалуется на O21, когда все контр-строки признаны независимыми', () => {
		const records = [recordOf()];
		expect(rulesOf(records, verdictsFor(records))).not.toContain('O21');
	});

	it('изменение строки model инвалидирует вердикт', () => {
		const records = [recordOf()];
		const verdicts = verdictsFor(records);
		const changed = [recordOf()];
		const step = changed[0]!.exercise.procedure.steps[0]!;
		Object.assign(step.oracles[0]!, { model: ['таз лежит на коврике'] });
		expect(rulesOf(changed, verdicts)).toContain('O21');
	});

	it('требует источник процедуры', () => {
		const records = [recordOf()];
		const repositories = {
			...repositoriesOf(records, verdictsFor(records)),
			sources: { readAll: () => [] }
		};
		expect(
			validateExercises(repositories).findings.some((finding) =>
				finding.rule.startsWith('O5')
			)
		).toBe(true);
	});

	it('требует класс снаряда, когда главное средство не тело', () => {
		const records = [recordOf()];
		const repositories = {
			...repositoriesOf(records, verdictsFor(records)),
			catalog: {
				readEquipment: () => [
					{
						canonEn: 'Bench',
						id: BODY,
						kind: 'apparatus' as const,
						name: 'Скамья',
						slug: 'bench'
					}
				],
				readTargets: () => []
			}
		};
		const messages = validateExercises(repositories).findings.map((finding) => finding.message);
		expect(messages).toContain('шаг 1 [initial]: не задано «снаряд»');
	});

	it('строит хеш вердикта из предиката, модели шага и строки', () => {
		const records = [recordOf()];
		const [first] = counterLinesOf(records, hasher);
		expect(first?.hash).toBe(
			verdictHashText(
				'Таз на месте',
				['Таз на месте', 'таз под корпусом'],
				'таз уходит вперёд'
			)
		);
	});
});
