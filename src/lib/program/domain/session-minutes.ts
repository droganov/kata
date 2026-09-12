import type { PlanExercise } from './plan-exercise.ts';
import type { Section, Slot, Timing } from './program.ts';

import { holdSecondsOfDose, setsOfDose } from './dose-plan.ts';
import { pickOf, SECTION_MODE } from './program.ts';

const SECONDS_PER_MINUTE = 60;

export interface PickedSection {
	readonly picks: readonly PickedSlot[];
	readonly section: Section;
}

export interface PickedSlot {
	readonly exercises: readonly PlanExercise[];
	readonly slot: Slot;
}

export const exerciseSecondsOf = (timing: Timing, exercise: PlanExercise): number => {
	if (exercise.seconds !== undefined) return exercise.seconds;
	const hold = holdSecondsOfDose(exercise.dose);
	return hold === 0 ? 0 : setsOfDose(exercise.dose) * (hold + timing.hold_rest_sec);
};

export const sessionMinutesOf = (timing: Timing, sections: readonly PickedSection[]): number => {
	const seconds = sections.reduce((total, section) => total + sectionSeconds(timing, section), 0);
	return Math.round(seconds / SECONDS_PER_MINUTE);
};

const loadedSeconds = (timing: Timing, section: PickedSection): number => {
	const sets = section.picks
		.flatMap((picked) => picked.exercises)
		.map((exercise) => setsOfDose(exercise.dose));
	const last = sets.length - 1;
	const work = sets.reduce(
		(total, count, at) =>
			total +
			count *
				(timing.work_sec_per_set +
					(at === last ? timing.rest_sec_accessory : timing.rest_sec_strength)),
		0
	);
	return work + sets.length * timing.transition_sec;
};

const pacedSeconds = (timing: Timing, section: PickedSection): number =>
	section.picks.reduce((total, picked) => total + slotSeconds(timing, picked), 0);

const sectionSeconds = (timing: Timing, section: PickedSection): number => {
	if (section.section.mode === SECTION_MODE.loaded) return loadedSeconds(timing, section);
	const paced = pacedSeconds(timing, section);
	if (section.section.mode !== SECTION_MODE.cardio || paced > 0) return paced;
	return (timing.warmup_general_min ?? 0) * SECONDS_PER_MINUTE;
};

const slotSeconds = (timing: Timing, picked: PickedSlot): number => {
	const each = picked.slot.sec_each;
	if (each === undefined)
		return picked.exercises.reduce(
			(total, exercise) => total + exerciseSecondsOf(timing, exercise),
			0
		);
	return pickOf(picked.slot) * each;
};
