import type { ProgramPlan, ProgramRule } from '../program-plan.ts';

import { programInvariants } from '../program-invariants.ts';
import {
	groupVolumeCorridor,
	majorGroupFrequency,
	minSetsPerExercise,
	progressionDeclared
} from './composition-rules.ts';
import { freeWeightLimit, sessionTimeBudget, slotDepth } from './constraint-rules.ts';
import { glutesInBase, glutesWeeklyVolume } from './glute-rules.ts';
import {
	dynamicHipBeforeLoad,
	hipPlanesCovered,
	hipStretchMethod,
	hipStretchPerSession,
	noLongHoldBeforeLoad,
	staticHipAfterLoad
} from './hip-rules.ts';
import {
	isometricProgression,
	isometricThreePlanes,
	spineSafeLoad,
	stretchWithoutLumbarFlexion
} from './lumbar-rules.ts';
import { aerobicWeeklyMinutes, staticStretchEverySession } from './secondary-rules.ts';
import { goalsChecked, sectionModeMatches } from './structure-rules.ts';

const invariantsRule: ProgramRule = (plan: ProgramPlan) =>
	programInvariants(plan.program, new Set(plan.exercises.keys()));

const PROGRAM_RULES: readonly ProgramRule[] = [
	invariantsRule,
	glutesInBase,
	glutesWeeklyVolume,
	isometricThreePlanes,
	spineSafeLoad,
	isometricProgression,
	stretchWithoutLumbarFlexion,
	dynamicHipBeforeLoad,
	staticHipAfterLoad,
	noLongHoldBeforeLoad,
	hipPlanesCovered,
	hipStretchPerSession,
	hipStretchMethod,
	staticStretchEverySession,
	aerobicWeeklyMinutes,
	majorGroupFrequency,
	groupVolumeCorridor,
	minSetsPerExercise,
	progressionDeclared,
	freeWeightLimit,
	sessionTimeBudget,
	slotDepth,
	sectionModeMatches,
	goalsChecked
];

export const rulesForProgram = (): readonly ProgramRule[] => PROGRAM_RULES;
