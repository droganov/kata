import { describe, expect, it } from 'vitest';

import type { ProgramPlan } from '../program-plan.ts';
import type { Program } from '../program.ts';

import { rulesForProgram } from './program-rules.ts';

const PLAN: ProgramPlan = {
	exercises: new Map(),
	hipMobilityExerciseIds: new Set(),
	program: {
		contraindications: {
			axial_load: true,
			free_weight_kg_max: 10,
			loaded_lumbar_extension: true,
			loaded_lumbar_flexion: true
		},
		goals: { primary: [], secondary: [] },
		progression: { base: 'b', isometric: '15с', pool: 'p', stop_rule: 's' },
		schedule: { rotation_weeks: 1, session_budget_min: 70, sessions_per_week: 1 },
		sections: [
			{
				bank: 'bank',
				id: 'strength',
				mode: 'loaded',
				slots: [{ exercises: ['lost'], id: 'base', kind: 'base', label: 'База' }],
				slug: 'strength',
				title: 'Силовой'
			}
		],
		timing: {
			hold_rest_sec: 10,
			rest_sec_accessory: 60,
			rest_sec_strength: 70,
			transition_sec: 45,
			work_sec_per_set: 45
		},
		title: 'Программа',
		user: 'user'
	} as unknown as Program,
	sessions: [],
	volume: { frequency: new Map(), volume: new Map() }
};

describe('rulesForProgram', () => {
	it('отдаёт полный набор правил, включая инварианты', () => {
		const rules = rulesForProgram();
		expect(rules).toHaveLength(24);
		const rulesOf = rules.flatMap((rule) => rule(PLAN)).map((finding) => finding.rule);
		expect(rulesOf).toContain('I1 SLOT_REFERENCES');
		expect(new Set(rulesOf).size).toBe(rulesOf.length);
	});
});
