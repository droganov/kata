import type {
	Exercise,
	ExerciseRecord,
	Oracle,
	Procedure,
	Step
} from '../lib/exercise/domain/exercise.ts';

import { uuidOfLabel } from './uuid.ts';

const ORACLE_BASE: Oracle = {
	counterModel: ['Провисание таза'],
	id: uuidOfLabel('oracle-base'),
	model: ['Ладони под плечами'],
	predicate: 'Корпус в линию'
};

export const STEP_BASE: Step = {
	active: [uuidOfLabel('target-base')],
	id: uuidOfLabel('step-base'),
	oracles: [ORACLE_BASE],
	title: 'Принять упор лёжа'
};

const PROCEDURE_BASE: Procedure = {
	id: uuidOfLabel('procedure-base'),
	steps: [
		STEP_BASE,
		{ ...STEP_BASE, id: uuidOfLabel('step-base-2'), title: 'Удержать положение' }
	]
};

export const EXERCISE_BASE: Exercise = {
	constraints: { axial: false, free_weight: false, lumbar_ext: false, lumbar_flex: false },
	dose: '3×12',
	equipment: [{ id: uuidOfLabel('equipment-base'), role: 'main' }],
	id: uuidOfLabel('exercise-base'),
	mode: 'loaded',
	name: 'Упражнение',
	procedure: PROCEDURE_BASE,
	slug: 'exercise_base',
	source: uuidOfLabel('source-base'),
	targets: [{ id: uuidOfLabel('target-base'), role: 'primary' }]
};

export const RECORD_BASE: ExerciseRecord = {
	bank: 'strength',
	contourSlug: 'knee',
	contourTitle: 'колено',
	exercise: EXERCISE_BASE
};
