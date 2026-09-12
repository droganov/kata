import { describe, expect, it } from 'vitest';

import type { Target } from '../domain/target.ts';

import { uuidOf } from '../../shared/uuid.ts';
import { findTargets } from './find-targets.ts';

const MUSCLE_ID = uuidOf('01a0889d-3800-7ef5-adfd-a56bcb2334c5');
const JOINT_ID = uuidOf('01a0889d-3845-7b73-adc5-6b00a88f5523');

const targets: readonly Target[] = [
	{
		group: 'neck',
		id: MUSCLE_ID,
		kind: 'muscle',
		latin: 'Sternocleidomastoid',
		name: 'ГКС',
		slug: 'sternocleidomastoid',
		zone: 'neck'
	},
	{
		id: JOINT_ID,
		kind: 'joint',
		latin: 'Cervical spine',
		name: 'Шейный отдел',
		slug: 'cervical_spine',
		zone: 'neck'
	}
];
const repository = { readAll: () => targets };

describe('findTargets', () => {
	it('без фильтра отдаёт все цели', () => {
		expect(findTargets(repository).map((view) => view.slug)).toEqual([
			'sternocleidomastoid',
			'cervical_spine'
		]);
	});

	it('с фильтром отдаёт только запрошенные', () => {
		expect(findTargets(repository, [JOINT_ID]).map((view) => view.kind)).toEqual(['joint']);
	});
});
