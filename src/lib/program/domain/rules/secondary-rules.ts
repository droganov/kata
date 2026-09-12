import type { Finding } from '../finding.ts';
import type { ProgramPlan } from '../program-plan.ts';

import { PROGRAM_GOAL, programSubject, ruleCheck } from '../finding.ts';
import { SECTION_MODE, walkingMinutesOf } from '../program.ts';
import { LIST_SEPARATOR, sessionExercisesWithMode } from './rule-helpers.ts';

const RULE_AEROBIC_WEEKLY_MINUTES = 'E2 AEROBIC_WEEKLY_MINUTES';
const RULE_STATIC_STRETCH_EVERY_SESSION = 'E6 STATIC_STRETCH_EVERY_SESSION';
const MIN_AEROBIC_MINUTES = 150;
const MAX_AEROBIC_MINUTES = 300;
const MIN_STRETCHES_PER_SESSION = 3;
const NO_MINUTES = 0;
const GYM_LABEL = 'зал ';
const WALKING_LABEL = ' мин + ходьба ';
const TOTAL_LABEL = ' мин = ';
const WEEK_LABEL = ' мин/нед';
const BY_SESSION = 'по занятиям: ';

export const aerobicWeeklyMinutes = (plan: ProgramPlan): readonly Finding[] => {
	const gym =
		(plan.program.timing.warmup_general_min ?? NO_MINUTES) *
		plan.program.schedule.sessions_per_week;
	const walking = walkingMinutesOf(plan.program);
	const total = gym + walking;
	return ruleCheck(
		total >= MIN_AEROBIC_MINUTES && total <= MAX_AEROBIC_MINUTES,
		PROGRAM_GOAL.secondary,
		RULE_AEROBIC_WEEKLY_MINUTES,
		programSubject(plan.program),
		`${GYM_LABEL}${String(gym)}${WALKING_LABEL}${String(walking)}${TOTAL_LABEL}${String(total)}${WEEK_LABEL}`
	);
};

export const staticStretchEverySession = (plan: ProgramPlan): readonly Finding[] => {
	const counts = plan.sessions.map(
		(session) => sessionExercisesWithMode(session, SECTION_MODE.static_stretch).length
	);
	return ruleCheck(
		counts.every((count) => count >= MIN_STRETCHES_PER_SESSION),
		PROGRAM_GOAL.secondary,
		RULE_STATIC_STRETCH_EVERY_SESSION,
		programSubject(plan.program),
		`${BY_SESSION}${counts.map(String).join(LIST_SEPARATOR)}`
	);
};
