import type { PlanExercise, PlanExercises } from './plan-exercise.ts';
import type { Program, Slot } from './program.ts';
import type { PickedSection, PickedSlot } from './session-minutes.ts';
import type { Session, SessionSection } from './session.ts';

import { planExercisesOf } from './plan-exercise.ts';
import {
	CORE_PLANE,
	hipPlanesOf,
	pairingsOf,
	pickOf,
	rotationLength,
	SLOT_KIND
} from './program.ts';
import { sessionMinutesOf } from './session-minutes.ts';

const SESSION_TITLE = 'Занятие ';
const WEEK_MARK = 'w';
const DAY_MARK = 'd';
const PLANE_KEY = '/plane';
const LATERAL_KEY = '/lateral';
const OTHER_KEY = '/other';
const KEY_SEPARATOR = '/';
const FIRST_PICK = 1;

export const HIP_PLANE_RULE = 'за ротацию покрыть все шесть направлений сустава';
export const LATERAL_RULE = 'из двух позиций минимум одна — боковая плоскость (lateral)';

type Cursor = Map<string, number>;

type PickedSlots = Map<string, readonly PlanExercise[]>;

export const sessionsOf = (program: Program, exercises: PlanExercises): readonly Session[] => {
	const cursor: Cursor = new Map();
	const sessions: Session[] = [];
	for (let index = FIRST_PICK; index <= rotationLength(program); index += 1)
		sessions.push(sessionOf(program, exercises, cursor, index));
	return sessions;
};

const cycledOne = <Item>(items: readonly Item[], cursor: Cursor, key: string): readonly Item[] => {
	if (items.length === 0) return [];
	const at = stepOf(cursor, key) % items.length;
	return items.slice(at, at + FIRST_PICK);
};

const hipPlanePicks = (
	program: Program,
	slot: Slot,
	candidates: readonly PlanExercise[],
	cursor: Cursor
): readonly PlanExercise[] => {
	const planes = hipPlanesOf(program);
	if (planes.length === 0) return roundRobinPicks(slot, candidates, cursor);
	const picks: PlanExercise[] = [];
	for (let taken = 0; taken < pickOf(slot); taken += 1)
		for (const plane of cycledOne(planes, cursor, `${slot.id}${PLANE_KEY}`))
			picks.push(
				...cycledOne(
					candidates.filter((item) => item.hipPlane === plane),
					cursor,
					`${slot.id}${KEY_SEPARATOR}${plane}`
				)
			);
	return picks;
};

const isLoadedToday = (picked: PickedSlots, slotId: string): boolean => {
	const chosen = picked.get(slotId);
	return chosen !== undefined && chosen.length > 0;
};

const lateralPicks = (
	slot: Slot,
	candidates: readonly PlanExercise[],
	cursor: Cursor
): readonly PlanExercise[] => {
	const lateral = candidates.filter((item) => item.plane === CORE_PLANE.lateral);
	const other = candidates.filter((item) => item.plane !== CORE_PLANE.lateral);
	const rest: PlanExercise[] = [];
	for (let taken = FIRST_PICK; taken < pickOf(slot); taken += 1)
		rest.push(...cycledOne(other, cursor, `${slot.id}${OTHER_KEY}`));
	return [...cycledOne(lateral, cursor, `${slot.id}${LATERAL_KEY}`), ...rest];
};

const pairedCandidatesOf = (
	program: Program,
	candidates: readonly PlanExercise[],
	picked: PickedSlots
): readonly PlanExercise[] => {
	const paired = new Set<string>();
	for (const pairing of pairingsOf(program))
		if (isLoadedToday(picked, pairing.slot)) for (const id of pairing.exercises) paired.add(id);
	const narrowed = candidates.filter((item) => paired.has(item.id));
	return narrowed.length === 0 ? candidates : narrowed;
};

const roundRobinPicks = (
	slot: Slot,
	candidates: readonly PlanExercise[],
	cursor: Cursor
): readonly PlanExercise[] => {
	const picks: PlanExercise[] = [];
	for (let taken = 0; taken < pickOf(slot); taken += 1)
		picks.push(...cycledOne(candidates, cursor, slot.id));
	return slot.allow_repeat === true ? picks : [...new Set(picks)];
};

const sessionOf = (
	program: Program,
	exercises: PlanExercises,
	cursor: Cursor,
	index: number
): Session => {
	const picked: PickedSlots = new Map();
	const sections: PickedSection[] = [];
	for (const section of program.sections) {
		const picks: PickedSlot[] = [];
		for (const slot of section.slots) {
			const chosen = slotPicksOf(program, slot, exercises, cursor, picked);
			picked.set(slot.id, chosen);
			picks.push({ exercises: chosen, slot });
		}
		sections.push({ picks, section });
	}
	return {
		index,
		minutes: sessionMinutesOf(program.timing, sections),
		program: program.id,
		sections: sections.map((picks) => sessionSectionOf(picks)),
		slug: sessionSlugOf(program, index),
		title: `${SESSION_TITLE}${String(index)}`
	};
};

const sessionSectionOf = (picked: PickedSection): SessionSection => ({
	mode: picked.section.mode,
	section: picked.section.id,
	slots: picked.picks.map((slot) => ({
		exercises: slot.exercises,
		kind: slot.slot.kind,
		label: slot.slot.label,
		slot: slot.slot.id
	})),
	slug: picked.section.slug,
	title: picked.section.title
});

const sessionSlugOf = (program: Program, index: number): string => {
	const perWeek = program.schedule.sessions_per_week;
	const week = Math.floor((index - FIRST_PICK) / perWeek) + FIRST_PICK;
	const day = ((index - FIRST_PICK) % perWeek) + FIRST_PICK;
	return `${WEEK_MARK}${String(week)}${DAY_MARK}${String(day)}`;
};

const slotPicksOf = (
	program: Program,
	slot: Slot,
	exercises: PlanExercises,
	cursor: Cursor,
	picked: PickedSlots
): readonly PlanExercise[] => {
	const all = planExercisesOf(slot.exercises, exercises);
	if (slot.kind === SLOT_KIND.base) return all;
	const candidates = pairedCandidatesOf(program, all, picked);
	if (slot.rule === HIP_PLANE_RULE) return hipPlanePicks(program, slot, candidates, cursor);
	if (slot.rule === LATERAL_RULE) return lateralPicks(slot, candidates, cursor);
	return roundRobinPicks(slot, candidates, cursor);
};

const stepOf = (cursor: Cursor, key: string): number => {
	const at = cursor.get(key) ?? 0;
	cursor.set(key, at + FIRST_PICK);
	return at;
};
