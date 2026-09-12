import type { Finding } from '../finding.ts';
import type { PlanExercise } from '../plan-exercise.ts';
import type { ProgramPlan } from '../program-plan.ts';
import type { Contraindications, CorePlane } from '../program.ts';
import type { Session } from '../session.ts';

import { PROGRAM_GOAL, programSubject, ruleCheck } from '../finding.ts';
import { CORE_PLANE, SECTION_MODE } from '../program.ts';
import { candidatesOf, LIST_SEPARATOR, sessionExercisesWithMode } from './rule-helpers.ts';

const RULE_ISOMETRIC_THREE_PLANES = 'E3 ISOMETRIC_THREE_PLANES';
const RULE_SPINE_SAFE_LOAD = 'E3 SPINE_SAFE_LOAD';
const RULE_ISOMETRIC_PROGRESSION = 'E4 ISOMETRIC_PROGRESSION';
const RULE_STRETCH_NO_LUMBAR_FLEXION = 'E3 STRETCH_NO_LUMBAR_FLEXION';
const HOLD_STEP = '15с';
const BEND_WORD = 'наклон';
const STANDING_WORD = 'стоя';
const REQUIRED_PLANES: readonly CorePlane[] = [
	CORE_PLANE.anterior,
	CORE_PLANE.lateral,
	CORE_PLANE.posterior
];

export const isometricProgression = (plan: ProgramPlan): readonly Finding[] => {
	const text = plan.program.progression.isometric;
	return ruleCheck(
		text.includes(HOLD_STEP),
		PROGRAM_GOAL.lumbar_stiffness,
		RULE_ISOMETRIC_PROGRESSION,
		programSubject(plan.program),
		text
	);
};

export const isometricThreePlanes = (plan: ProgramPlan): readonly Finding[] => {
	const missing = plan.sessions
		.filter((session) => !hasRequiredPlanes(planesOf(session)))
		.map((session) => `${session.slug}: ${planesOf(session).join(LIST_SEPARATOR)}`);
	return ruleCheck(
		missing.length === 0,
		PROGRAM_GOAL.lumbar_stiffness,
		RULE_ISOMETRIC_THREE_PLANES,
		programSubject(plan.program),
		missing.join(LIST_SEPARATOR)
	);
};

export const spineSafeLoad = (plan: ProgramPlan): readonly Finding[] => {
	const forbidden = candidatesOf(plan, SECTION_MODE.loaded)
		.filter((exercise) => isForbiddenLoad(plan.program.contraindications, exercise))
		.map((exercise) => exercise.name);
	return ruleCheck(
		forbidden.length === 0,
		PROGRAM_GOAL.lumbar_stiffness,
		RULE_SPINE_SAFE_LOAD,
		programSubject(plan.program),
		`нарушители: ${forbidden.join(LIST_SEPARATOR)}`
	);
};

export const stretchWithoutLumbarFlexion = (plan: ProgramPlan): readonly Finding[] => {
	const bends = candidatesOf(plan, SECTION_MODE.static_stretch)
		.filter((exercise) => isStandingBend(exercise.name))
		.map((exercise) => exercise.name);
	return ruleCheck(
		bends.length === 0,
		PROGRAM_GOAL.lumbar_stiffness,
		RULE_STRETCH_NO_LUMBAR_FLEXION,
		programSubject(plan.program),
		bends.join(LIST_SEPARATOR)
	);
};

const hasRequiredPlanes = (planes: readonly string[]): boolean =>
	REQUIRED_PLANES.every((plane) => planes.includes(plane));

const isForbiddenLoad = (contraindications: Contraindications, exercise: PlanExercise): boolean => {
	if (contraindications.axial_load && exercise.constraints.axial) return true;
	if (contraindications.loaded_lumbar_flexion && exercise.constraints.lumbar_flex) return true;
	return contraindications.loaded_lumbar_extension && exercise.constraints.lumbar_ext;
};

const isStandingBend = (name: string): boolean => {
	const lowered = name.toLowerCase();
	return lowered.includes(BEND_WORD) && lowered.includes(STANDING_WORD);
};

const planesOf = (session: Session): readonly string[] =>
	[
		...new Set(
			sessionExercisesWithMode(session, SECTION_MODE.isometric).flatMap((exercise) =>
				exercise.plane === undefined ? [] : [exercise.plane]
			)
		)
	].toSorted((first, second) => first.localeCompare(second));
