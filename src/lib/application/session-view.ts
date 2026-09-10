import type { Axis, Day, Exercise, Link, Named, Slot } from '$lib/domain/model';

export const TAB = { procedure: 'proc', prompt: 'prompt' } as const;
export type Tab = (typeof TAB)[keyof typeof TAB];
export const SLOT_KIND = { base: 'base', pool: 'pool' } as const;
export const ORIGIN = { base: 'base', pool: 'pool' } as const;
export const OPEN_SLOTS_STORAGE_KEY = 'dev:open-slots';
export const COPIED_MS = 1500;
const LIST_SEPARATOR = ' · ';
const ROLE_SEPARATOR = ' — ';
const NONE = '—';
const DEFAULT_UNIT = 'контур';
const LABEL_PARTS = 2;

export const AXIS_TITLE: Record<string, string> = {
	static: 'Калистеника',
	strength: 'Силовой',
	stretch: 'Растяжка',
	warmup: 'Разминка',
	warmup_cardio: 'Разогрев'
};

export const BANK_OF_AXIS: Record<string, string> = {
	static: 'calisthenics',
	strength: 'strength',
	stretch: 'stretch'
};

export interface Group {
	key: string;
	slots: [PoolSlot, ...PoolSlot[]];
	zone: string | undefined;
}
interface PoolSlot {
	id: string;
	label: string;
	pick: number;
	unit: string;
	zone: string | undefined;
}

export function activeNames(ids: string[], names: Record<string, string>): string {
	return ids.length > 0 ? ids.map((id) => names[id] ?? id).join(LIST_SEPARATOR) : NONE;
}

export function axesOf(days: Day[]): Axis[] {
	return days[0]?.axes ?? [];
}

export function axisTitle(axis: Axis): string {
	return AXIS_TITLE[axis.id] ?? axis.title;
}

export function bankKey(axisId: string, exerciseId: string): string {
	return `${BANK_OF_AXIS[axisId] ?? axisId}:${exerciseId}`;
}

export function doseOf(exercise: Exercise): string {
	return exercise.dose ?? '';
}

export function groupByZone(axis: string, slots: Slot[]): Group[] {
	const out: Group[] = [];
	for (const slot of slots) {
		const poolSlot: PoolSlot = {
			id: slot.id,
			label: slot.label,
			pick: slot.items.length,
			unit: slot.unit ?? DEFAULT_UNIT,
			zone: slot.zone
		};
		const last = out.at(-1);
		if (poolSlot.zone !== undefined && last?.zone === poolSlot.zone) last.slots.push(poolSlot);
		else out.push({ key: `${axis}:${poolSlot.id}`, slots: [poolSlot], zone: poolSlot.zone });
	}
	return out;
}

export function jointOf(label: string): string {
	const [, joint] = label.split(LIST_SEPARATOR, LABEL_PARTS);
	return joint ?? label;
}

export function linkText(links: Link[] | undefined, names: Record<string, string>): string {
	return (links ?? [])
		.map((link) => `${names[link.id] ?? link.id}${ROLE_SEPARATOR}${link.role}`)
		.join(LIST_SEPARATOR);
}

export function nameMap(items: Named[]): Record<string, string> {
	return Object.fromEntries(items.map((item) => [item.id, item.name]));
}

export function promptOf(prompts: Record<string, string>, key: string): string {
	return prompts[key] ?? '';
}
