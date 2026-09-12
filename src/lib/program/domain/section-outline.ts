import type { Program, SectionMode, Slot } from './program.ts';

import { pickOf, SLOT_KIND } from './program.ts';

export interface ContourLocator {
	readonly contourTitle: string;
	readonly exerciseIds: readonly string[];
	readonly zoneId: string;
	readonly zoneTitle: string;
}

export interface SectionOutline {
	readonly baseExerciseIds: readonly string[];
	readonly groups: readonly SlotGroup[];
	readonly id: string;
	readonly mode: SectionMode;
	readonly slug: string;
	readonly title: string;
}

export interface SlotOutline {
	readonly allowRepeat: boolean;
	readonly contourTitle?: string;
	readonly exerciseIds: readonly string[];
	readonly id: string;
	readonly label: string;
	readonly pick: number;
	readonly rule?: string;
}

interface SlotGroup {
	readonly id: string;
	readonly slots: readonly [SlotOutline, ...SlotOutline[]];
	readonly zone?: ZoneRef;
}

interface ZoneRef {
	readonly id: string;
	readonly title: string;
}

const hasSameMembers = (left: readonly string[], right: readonly string[]): boolean =>
	left.length === right.length && left.every((id) => right.includes(id));

const contourOf = (slot: Slot, contours: readonly ContourLocator[]): ContourLocator | undefined =>
	contours.find((contour) => hasSameMembers(contour.exerciseIds, slot.exercises));

const slotOutlineOf = (slot: Slot, contour: ContourLocator | undefined): SlotOutline => ({
	allowRepeat: slot.allow_repeat === true,
	...(contour !== undefined && { contourTitle: contour.contourTitle }),
	exerciseIds: slot.exercises,
	id: slot.id,
	label: slot.label,
	pick: pickOf(slot),
	...(slot.rule !== undefined && { rule: slot.rule })
});

const appendToGroups = (
	groups: readonly SlotGroup[],
	slot: Slot,
	contour: ContourLocator | undefined
): readonly SlotGroup[] => {
	const outline = slotOutlineOf(slot, contour);
	const last = groups.at(-1);
	const isSameZone = contour !== undefined && last?.zone?.id === contour.zoneId;
	if (isSameZone) return [...groups.slice(0, -1), { ...last, slots: [...last.slots, outline] }];
	const zone =
		contour === undefined ? {} : { zone: { id: contour.zoneId, title: contour.zoneTitle } };
	return [...groups, { id: slot.id, slots: [outline], ...zone }];
};

export const sectionOutlinesOf = (
	program: Program,
	contours: readonly ContourLocator[]
): readonly SectionOutline[] =>
	program.sections.map((section) => ({
		baseExerciseIds: section.slots
			.filter((slot) => slot.kind === SLOT_KIND.base)
			.flatMap((slot) => slot.exercises),
		groups: section.slots
			.filter((slot) => slot.kind === SLOT_KIND.pool)
			.reduce<readonly SlotGroup[]>(
				(groups, slot) => appendToGroups(groups, slot, contourOf(slot, contours)),
				[]
			),
		id: section.id,
		mode: section.mode,
		slug: section.slug,
		title: section.title
	}));
