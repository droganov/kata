import type { Program } from '../lib/program/domain/program.ts';

const BUDGET_MIN = 70;
const HOLD_REST_SEC = 10;
const KG_MAX = 10;
const REST_SEC_ACCESSORY = 60;
const REST_SEC_STRENGTH = 70;
const ROTATION_WEEKS = 1;
const SESSIONS_PER_WEEK = 2;
const TRANSITION_SEC = 45;
const WORK_SEC_PER_SET = 45;

export const PROGRAM_BASE: Program = {
	contraindications: {
		axial_load: true,
		free_weight_kg_max: KG_MAX,
		loaded_lumbar_extension: true,
		loaded_lumbar_flexion: true
	},
	goals: { primary: [], secondary: [] },
	id: 'program-base',
	progression: { base: 'b', isometric: '15с', pool: 'p', stop_rule: 's' },
	schedule: {
		rotation_weeks: ROTATION_WEEKS,
		session_budget_min: BUDGET_MIN,
		sessions_per_week: SESSIONS_PER_WEEK
	},
	sections: [],
	timing: {
		hold_rest_sec: HOLD_REST_SEC,
		rest_sec_accessory: REST_SEC_ACCESSORY,
		rest_sec_strength: REST_SEC_STRENGTH,
		transition_sec: TRANSITION_SEC,
		work_sec_per_set: WORK_SEC_PER_SET
	},
	title: 'Программа',
	user: 'user-base'
};
