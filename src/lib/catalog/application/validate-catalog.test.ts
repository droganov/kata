import { describe, expect, it } from 'vitest';

import type { Bank } from '../domain/bank.ts';
import type { Equipment } from '../domain/equipment.ts';
import type { Target } from '../domain/target.ts';
import type { CatalogRepositories } from './catalog-repositories.ts';

import { uuidOf } from '../../shared/uuid.ts';
import { validateCatalog } from './validate-catalog.ts';

const ID = uuidOf('01a0889d-3852-7051-a039-c9778729a468');
const TARGET_ID = uuidOf('01a0889d-3845-7b73-adc5-6b00a88f5523');
const EXERCISE_ID = uuidOf('01a0889d-3851-7468-b94f-0e0365b0548b');
const SAFE_NAME = 'Наклоны головы';
const SPINE_NAME = 'Скручивания корпуса';

const equipment: Equipment = {
	canon_en: 'Bodyweight',
	exercises: [EXERCISE_ID],
	id: ID,
	kind: 'body',
	name: 'Тело',
	slug: 'body'
};

const target: Target = {
	id: TARGET_ID,
	kind: 'joint',
	latin: 'Cervical spine',
	name: 'Шейный отдел',
	slug: 'cervical_spine',
	zone: 'neck'
};

const bankOf = (name: string): Bank => ({
	id: ID,
	rules: [],
	session_budget_sec: 420,
	slug: 'warmup',
	title: 'Разминка',
	zones: [
		{
			contours: [
				{
					exercises: [
						{
							constraints: {
								axial: false,
								free_weight: false,
								lumbar_ext: false,
								lumbar_flex: false
							},
							dose: '8',
							equipment: [{ id: ID, role: 'main' }],
							id: EXERCISE_ID,
							mode: 'dynamic',
							name,
							seconds: 20,
							slug: 'neck_flex',
							targets: [{ id: TARGET_ID, role: 'primary' }]
						}
					],
					id: ID,
					pick: 1,
					slug: 'cervical',
					title: 'Шейный отдел'
				}
			],
			id: ID,
			slug: 'neck',
			title: 'Шея'
		}
	]
});

const repositoriesWith = (bank: Bank): CatalogRepositories => ({
	banks: { readAll: () => [bank] },
	equipment: { readAll: () => [equipment] },
	targets: { readAll: () => [target] }
});

describe('validateCatalog', () => {
	it('отдаёт отчёт без провалов на исправном банке', () => {
		const report = validateCatalog(repositoriesWith(bankOf(SAFE_NAME)));
		expect(report.failureCount).toBe(0);
		expect(report.banks).toEqual([
			{ exerciseCount: 1, findings: [], slug: 'warmup', title: 'Разминка' }
		]);
	});

	it('считает провалы всех банков', () => {
		const report = validateCatalog(repositoriesWith(bankOf(SPINE_NAME)));
		expect(report.failureCount).toBeGreaterThan(0);
		expect(report.banks[0]?.findings[0]?.rule).toBe('R7 SPINE');
	});
});
