import type { Finding } from '../finding.ts';
import type { ProgramPlan } from '../program-plan.ts';

import { checkedGoals, PROGRAM_GOAL, programSubject, ruleCheck } from '../finding.ts';
import { planExercisesOf } from '../plan-exercise.ts';
import { sectionSlotsOf } from '../program.ts';
import { LIST_SEPARATOR } from './rule-helpers.ts';

const RULE_SECTION_MODE = 'E8 SECTION_MODE';
const RULE_GOALS_CHECKED = 'E8 GOALS_CHECKED';
const WITHOUT_RULES = 'первичные цели без проверок: ';

export const goalsChecked = (plan: ProgramPlan): readonly Finding[] => {
	const known = new Set<string>(checkedGoals());
	const lost = plan.program.goals.primary.filter((goal) => !known.has(goal));
	return ruleCheck(
		lost.length === 0,
		PROGRAM_GOAL.structure,
		RULE_GOALS_CHECKED,
		programSubject(plan.program),
		`${WITHOUT_RULES}${lost.join(LIST_SEPARATOR)}`
	);
};

export const sectionModeMatches = (plan: ProgramPlan): readonly Finding[] => {
	const wrong = sectionSlotsOf(plan.program).flatMap(({ section, slot }) =>
		planExercisesOf(slot.exercises, plan.exercises)
			.filter((exercise) => exercise.mode !== section.mode)
			.map((exercise) => `${section.slug}: ${exercise.slug} (${exercise.mode})`)
	);
	return ruleCheck(
		wrong.length === 0,
		PROGRAM_GOAL.structure,
		RULE_SECTION_MODE,
		programSubject(plan.program),
		wrong.join(LIST_SEPARATOR)
	);
};
