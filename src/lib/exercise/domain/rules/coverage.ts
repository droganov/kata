import type { StepType } from './step-type.ts';

import {
	BREATH,
	COMPENSATION,
	CONTACT,
	DIGITS,
	DRIFT,
	DURATION,
	END_POINT,
	FRAME_ARMS,
	FRAME_GEAR,
	FRAME_HEAD,
	FRAME_LEGS,
	FRAME_MOTION,
	FRAME_PELVIS,
	FRAME_TORSO,
	GEAR,
	GEAR_ANOMALY,
	HEAD,
	JERK,
	SPINE,
	SYMPTOM,
	TEMPO,
	WORKING_SIDE
} from './patterns.ts';
import { STEP_TYPE } from './step-type.ts';

const CLASS_NAME = {
	arms: 'руки',
	breath: 'дыхание',
	compensation: 'компенсация',
	contact: 'контакт',
	direction: 'направление',
	drift: 'дрейф',
	duration: 'длительность',
	endPoint: 'конечная точка',
	gear: 'снаряд',
	gearAnomaly: 'аномалия снаряда',
	head: 'голова',
	jerk: 'рывок/темп',
	legs: 'ноги',
	pelvis: 'таз',
	repeats: 'число повторов',
	side: 'сторона',
	spine: 'позвоночник',
	support: 'опора',
	symptom: 'симптом',
	tempo: 'темп',
	torso: 'корпус'
} as const;

const BREATH_CLASS: CoverageClass = { name: CLASS_NAME.breath, pattern: BREATH };
const CONTACT_CLASS: CoverageClass = { name: CLASS_NAME.contact, pattern: CONTACT };
const DRIFT_CLASS: CoverageClass = { name: CLASS_NAME.drift, pattern: DRIFT };
const DURATION_CLASS: CoverageClass = { name: CLASS_NAME.duration, pattern: DURATION };
const END_POINT_CLASS: CoverageClass = { name: CLASS_NAME.endPoint, pattern: END_POINT };
const COMPENSATION_CLASS: CoverageClass = {
	name: CLASS_NAME.compensation,
	pattern: COMPENSATION
};
const JERK_CLASS: CoverageClass = { name: CLASS_NAME.jerk, pattern: JERK };
const REPEATS_CLASS: CoverageClass = { name: CLASS_NAME.repeats, pattern: DIGITS };
const SPINE_CLASS: CoverageClass = { name: CLASS_NAME.spine, pattern: SPINE };

const FRAME_BASE: readonly CoverageClass[] = [
	{ name: CLASS_NAME.head, pattern: FRAME_HEAD },
	{ name: CLASS_NAME.torso, pattern: FRAME_TORSO },
	{ name: CLASS_NAME.pelvis, pattern: FRAME_PELVIS },
	{ name: CLASS_NAME.arms, pattern: FRAME_ARMS },
	{ name: CLASS_NAME.legs, pattern: FRAME_LEGS },
	{ name: CLASS_NAME.support, pattern: CONTACT }
];

const FRAME_BY_TYPE: Record<StepType, readonly CoverageClass[]> = {
	exit: [],
	hold: [DURATION_CLASS],
	initial: [],
	move: [{ name: CLASS_NAME.direction, pattern: FRAME_MOTION }, END_POINT_CLASS],
	repeat: [REPEATS_CLASS],
	setup: [],
	switch: []
};

const GEAR_CLASS: CoverageClass = { name: CLASS_NAME.gear, pattern: FRAME_GEAR };
const SIDE_CLASS: CoverageClass = { name: CLASS_NAME.side, pattern: WORKING_SIDE };
const SYMPTOM_CLASS: CoverageClass = { name: CLASS_NAME.symptom, pattern: SYMPTOM };

export interface CoverageClass {
	readonly name: string;
	readonly pattern: RegExp;
}

const COUNTER_COVERAGE: Record<StepType, readonly CoverageClass[]> = {
	exit: [JERK_CLASS],
	hold: [DRIFT_CLASS, BREATH_CLASS, SYMPTOM_CLASS],
	initial: [COMPENSATION_CLASS],
	move: [COMPENSATION_CLASS, JERK_CLASS],
	repeat: [DRIFT_CLASS, COMPENSATION_CLASS],
	setup: [{ name: CLASS_NAME.gearAnomaly, pattern: GEAR_ANOMALY }],
	switch: []
};

export const MODEL_COVERAGE: Record<StepType, readonly CoverageClass[]> = {
	exit: [CONTACT_CLASS],
	hold: [SPINE_CLASS, BREATH_CLASS, DURATION_CLASS],
	initial: [CONTACT_CLASS, SPINE_CLASS, { name: CLASS_NAME.head, pattern: HEAD }],
	move: [SPINE_CLASS, END_POINT_CLASS],
	repeat: [{ name: CLASS_NAME.tempo, pattern: TEMPO }, REPEATS_CLASS],
	setup: [{ name: CLASS_NAME.gear, pattern: GEAR }],
	switch: [CONTACT_CLASS]
};

export function counterClassesOf(type: StepType, hasSpineLoad: boolean): readonly CoverageClass[] {
	const classes = COUNTER_COVERAGE[type];
	return hasSpineLoad ? [...classes, SYMPTOM_CLASS] : classes;
}

export function frameClassesOf(
	type: StepType,
	hasMainGear: boolean,
	isPerSide: boolean
): readonly CoverageClass[] {
	return [
		...FRAME_BASE,
		...(hasMainGear ? [GEAR_CLASS] : []),
		...FRAME_BY_TYPE[type],
		...(isPerSide && type !== STEP_TYPE.setup ? [SIDE_CLASS] : [])
	];
}
