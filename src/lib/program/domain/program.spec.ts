import { describe, expect, it } from 'vitest';

import type { Program, Section, Slot } from './program.ts';

import { PROGRAM_BASE } from '../../../test/program-base.ts';
import {
	hipPlanesOf,
	pairingsOf,
	pickOf,
	rotationLength,
	sectionSlotsOf,
	volumeTargetsOf,
	walkingMinutesOf
} from './program.ts';

const base: Slot = { exercises: ['e1'], id: 'base', kind: 'base', label: 'База' };
const pool: Slot = {
	allow_repeat: false,
	exercises: ['e1', 'e2'],
	id: 'pool',
	kind: 'pool',
	label: 'Пул',
	pick: 2
};
const section: Section = {
	bank: 'bank',
	id: 'section',
	mode: 'loaded',
	slots: [base, pool],
	slug: 'strength',
	title: 'Силовой'
};
const full: Program = {
	...PROGRAM_BASE,
	hip_planes: ['flexion'],
	outside_gym: {
		walking: {
			intensity: 'moderate',
			min_per_session: 45,
			name: 'Ходьба',
			sessions_per_week: 4
		}
	},
	pairing: [{ exercises: ['e1'], slot: 'pool' }],
	schedule: { rotation_weeks: 2, session_budget_min: 70, sessions_per_week: 3 },
	sections: [section],
	volume_targets: { glutes: { max: 22, min: 12 } }
};
const bare: Program = { ...PROGRAM_BASE, schedule: full.schedule, sections: [section] };

describe('program', () => {
	it('считает pick базы одним, а пула — заявленным', () => {
		expect(pickOf(base)).toBe(1);
		expect(pickOf(pool)).toBe(2);
	});

	it('считает длину ротации занятиями за все недели', () => {
		expect(rotationLength(full)).toBe(6);
	});

	it('разворачивает разделы в пары раздел-слот', () => {
		expect(sectionSlotsOf(full).map(({ slot }) => slot.id)).toEqual(['base', 'pool']);
	});

	it('отдаёт необязательные поля программы или пустые значения', () => {
		expect(hipPlanesOf(full)).toEqual(['flexion']);
		expect(hipPlanesOf(bare)).toEqual([]);
		expect(pairingsOf(full)).toHaveLength(1);
		expect(pairingsOf(bare)).toEqual([]);
		expect(volumeTargetsOf(full)).toEqual([{ group: 'glutes', max: 22, min: 12 }]);
		expect(volumeTargetsOf(bare)).toEqual([]);
	});

	it('считает недельные минуты ходьбы вне зала', () => {
		const homeOnly: Program = {
			...PROGRAM_BASE,
			outside_gym: { mobility_home: { days_per_week: 7, min_per_day: 10, name: 'Дома' } },
			schedule: full.schedule,
			sections: [section]
		};
		expect(walkingMinutesOf(full)).toBe(180);
		expect(walkingMinutesOf(homeOnly)).toBe(0);
		expect(walkingMinutesOf(bare)).toBe(0);
	});
});
