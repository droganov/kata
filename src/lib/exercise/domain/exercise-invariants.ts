import type { Exercise, Step } from './exercise.ts';
import type { Issue } from './finding.ts';

import { mainEquipmentIdsOf, targetIdsOf } from './exercise.ts';
import { issueCheck } from './finding.ts';

const IDS_RULE = 'A1 IDS';
const MAIN_GEAR_RULE = 'A2 MAIN';
const REFS_RULE = 'A3 REFS';
const ACTIVE_RULE = 'A4 ACTIVE';
const DUPLICATE_IDS_MESSAGE = 'идентификаторы агрегата повторяются';
const MAIN_GEAR_MESSAGE = 'ровно одно средство с ролью main: ';
const DUPLICATE_EQUIPMENT_MESSAGE = 'средства повторяются';
const DUPLICATE_TARGETS_MESSAGE = 'цели повторяются';
const ACTIVE_SUBSET_MESSAGE = 'active шага вне targets упражнения: ';
const STEP_MARK = 'шаг ';
const SINGLE_MAIN = 1;

export const exerciseInvariants = (exercise: Exercise): readonly Issue[] => {
	const mainIds = mainEquipmentIdsOf(exercise);
	return [
		...issueCheck(hasUniqueIds(exercise), IDS_RULE, DUPLICATE_IDS_MESSAGE),
		...issueCheck(
			mainIds.length === SINGLE_MAIN,
			MAIN_GEAR_RULE,
			`${MAIN_GEAR_MESSAGE}${String(mainIds.length)}`
		),
		...issueCheck(
			new Set(exercise.equipment.map((reference) => reference.id)).size ===
				exercise.equipment.length,
			REFS_RULE,
			DUPLICATE_EQUIPMENT_MESSAGE
		),
		...issueCheck(
			targetIdsOf(exercise).size === exercise.targets.length,
			REFS_RULE,
			DUPLICATE_TARGETS_MESSAGE
		),
		...activeSubsetIssues(exercise)
	];
};

const activeSubsetIssues = (exercise: Exercise): readonly Issue[] => {
	const targetIds = targetIdsOf(exercise);
	return exercise.procedure.steps.flatMap((step, index) =>
		issueCheck(
			step.active.every((id) => targetIds.has(id)),
			ACTIVE_RULE,
			`${STEP_MARK}${String(index + 1)}: ${ACTIVE_SUBSET_MESSAGE}${step.title}`
		)
	);
};

const hasUniqueIds = (exercise: Exercise): boolean => {
	const ids = [
		exercise.id,
		exercise.procedure.id,
		...exercise.procedure.steps.flatMap((step) => stepIdsOf(step))
	];
	return new Set(ids).size === ids.length;
};

const stepIdsOf = (step: Step): readonly string[] => [
	step.id,
	...step.oracles.map((oracle) => oracle.id)
];
