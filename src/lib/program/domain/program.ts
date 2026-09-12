const SINGLE_PICK = 1;
const NO_MINUTES = 0;

export const SECTION_MODE = {
	calisthenic: 'calisthenic',
	cardio: 'cardio',
	dynamic: 'dynamic',
	isometric: 'isometric',
	loaded: 'loaded',
	static_stretch: 'static_stretch'
} as const;

export const SLOT_KIND = { base: 'base', pool: 'pool' } as const;

export const CORE_PLANE = {
	anterior: 'anterior',
	anti_extension: 'anti_extension',
	anti_rotation: 'anti_rotation',
	balance: 'balance',
	lateral: 'lateral',
	posterior: 'posterior'
} as const;

export interface Contraindications {
	readonly axial_load: boolean;
	readonly free_weight_kg_max: number;
	readonly loaded_lumbar_extension: boolean;
	readonly loaded_lumbar_flexion: boolean;
}

export type CorePlane = (typeof CORE_PLANE)[keyof typeof CORE_PLANE];

export type HipPlane =
	'abduction' | 'adduction' | 'extension' | 'external_rot' | 'flexion' | 'internal_rot';

export interface Pairing {
	readonly exercises: readonly string[];
	readonly slot: string;
}

export interface Program {
	readonly contraindications: Contraindications;
	readonly goals: Goals;
	readonly hip_planes?: readonly HipPlane[];
	readonly id: string;
	readonly outside_gym?: OutsideGym;
	readonly pairing?: readonly Pairing[];
	readonly progression: Progression;
	readonly schedule: Schedule;
	readonly sections: readonly Section[];
	readonly timing: Timing;
	readonly title: string;
	readonly user: string;
	readonly volume_targets?: Readonly<Record<string, VolumeTarget>>;
}

export interface Progression {
	readonly base: string;
	readonly isometric: string;
	readonly pool: string;
	readonly stop_rule: string;
}

export interface Section {
	readonly bank: string;
	readonly id: string;
	readonly mode: SectionMode;
	readonly slots: readonly Slot[];
	readonly slug: string;
	readonly title: string;
}

export type SectionMode = (typeof SECTION_MODE)[keyof typeof SECTION_MODE];

export interface SectionSlot {
	readonly section: Section;
	readonly slot: Slot;
}

export interface Slot {
	readonly allow_repeat?: boolean;
	readonly exercises: readonly string[];
	readonly id: string;
	readonly kind: SlotKind;
	readonly label: string;
	readonly pick?: number;
	readonly rule?: string;
	readonly sec_each?: number;
}

export interface Timing {
	readonly hold_rest_sec: number;
	readonly rest_sec_accessory: number;
	readonly rest_sec_strength: number;
	readonly transition_sec: number;
	readonly warmup_general_min?: number;
	readonly work_sec_per_set: number;
}

export interface User {
	readonly id: string;
	readonly name: string;
	readonly programs: readonly string[];
}

export interface VolumeGroupTarget {
	readonly group: string;
	readonly max: number;
	readonly min: number;
}

interface Goals {
	readonly primary: readonly string[];
	readonly secondary: readonly string[];
}

interface MobilityHome {
	readonly days_per_week: number;
	readonly min_per_day: number;
	readonly name: string;
}

interface OutsideGym {
	readonly mobility_home?: MobilityHome;
	readonly walking?: Walking;
}

interface Schedule {
	readonly rotation_weeks: number;
	readonly session_budget_min: number;
	readonly sessions_per_week: number;
}

type SlotKind = (typeof SLOT_KIND)[keyof typeof SLOT_KIND];

interface VolumeTarget {
	readonly max: number;
	readonly min: number;
}

interface Walking {
	readonly intensity: string;
	readonly min_per_session: number;
	readonly name: string;
	readonly sessions_per_week: number;
}

export const hipPlanesOf = (program: Program): readonly HipPlane[] => program.hip_planes ?? [];

export const pairingsOf = (program: Program): readonly Pairing[] => program.pairing ?? [];

export const pickOf = (slot: Slot): number => slot.pick ?? SINGLE_PICK;

export const rotationLength = (program: Program): number =>
	program.schedule.sessions_per_week * program.schedule.rotation_weeks;

export const sectionSlotsOf = (program: Program): readonly SectionSlot[] =>
	program.sections.flatMap((section) => section.slots.map((slot) => ({ section, slot })));

export const volumeTargetsOf = (program: Program): readonly VolumeGroupTarget[] =>
	Object.entries(program.volume_targets ?? {}).map(([group, target]) => ({
		group,
		max: target.max,
		min: target.min
	}));

export const walkingMinutesOf = (program: Program): number => {
	const walking = program.outside_gym?.walking;
	return walking === undefined ? NO_MINUTES : walking.min_per_session * walking.sessions_per_week;
};
