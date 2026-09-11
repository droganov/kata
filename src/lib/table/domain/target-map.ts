export const MUSCLE_GROUP_FILE = 'strength';

export const WARMUP_FILE = 'warmup';

export const TARGET_KIND = {
	joint: 'joint',
	muscle: 'muscle',
	muscle_head: 'muscle_head',
	pattern: 'pattern',
	system: 'system'
} as const;

export interface CatalogTargetEntry {
	readonly alias?: string;
	readonly kind: TargetKind;
}

export const JOINT_MUSCLE_GROUP: Readonly<Record<string, string>> = {
	ankle: 'calves',
	cervical_spine: 'neck',
	elbow: 'arms',
	fingers: 'arms',
	foot_joints: 'calves',
	glenohumeral: 'shoulders',
	hip: 'thighs',
	knee: 'thighs',
	lumbopelvic: 'core',
	scapulothoracic: 'traps',
	thoracic_spine: 'back',
	wrist: 'arms'
};

export const CATALOG_TARGETS: Readonly<Record<string, CatalogTargetEntry>> = {
	abductors: { kind: TARGET_KIND.muscle },
	adductors: { kind: TARGET_KIND.muscle },
	ankle: { alias: 'ankle', kind: TARGET_KIND.joint },
	anti_extension: { kind: TARGET_KIND.pattern },
	anti_lateral: { kind: TARGET_KIND.pattern },
	anti_rotation: { kind: TARGET_KIND.pattern },
	biceps: { alias: 'biceps_brachii', kind: TARGET_KIND.muscle },
	cervical: { alias: 'cervical_spine', kind: TARGET_KIND.joint },
	chest_lower: { alias: 'pectoralis_major_abdominal', kind: TARGET_KIND.muscle_head },
	chest_mid: { alias: 'pectoralis_major_sternal', kind: TARGET_KIND.muscle_head },
	chest_upper: { alias: 'pectoralis_major_clavicular', kind: TARGET_KIND.muscle_head },
	delt_front: { alias: 'deltoid_anterior', kind: TARGET_KIND.muscle_head },
	delt_rear: { alias: 'deltoid_posterior', kind: TARGET_KIND.muscle_head },
	delt_side: { alias: 'deltoid_lateral', kind: TARGET_KIND.muscle_head },
	elbow: { alias: 'elbow', kind: TARGET_KIND.joint },
	erectors_flex: { kind: TARGET_KIND.pattern },
	erectors_hinge: { kind: TARGET_KIND.pattern },
	erectors_hold: { kind: TARGET_KIND.pattern },
	erectors_machine: { kind: TARGET_KIND.pattern },
	erectors_prone: { kind: TARGET_KIND.pattern },
	fingers: { alias: 'fingers', kind: TARGET_KIND.joint },
	forearms: { kind: TARGET_KIND.muscle },
	gastro_soleus: { kind: TARGET_KIND.muscle },
	glenohumeral: { alias: 'glenohumeral', kind: TARGET_KIND.joint },
	glute_max: { alias: 'gluteus_maximus', kind: TARGET_KIND.muscle },
	glute_med: { alias: 'gluteus_medius', kind: TARGET_KIND.muscle },
	hams_c: { kind: TARGET_KIND.muscle },
	hip: { alias: 'hip', kind: TARGET_KIND.joint },
	hip_flexors: { kind: TARGET_KIND.muscle },
	knee_j: { alias: 'knee', kind: TARGET_KIND.joint },
	lats: { alias: 'latissimus_dorsi', kind: TARGET_KIND.muscle },
	lumbar_rot: { kind: TARGET_KIND.pattern },
	lumbopelvic: { alias: 'lumbopelvic', kind: TARGET_KIND.joint },
	neck_extensors: { alias: 'neck_extensors', kind: TARGET_KIND.muscle },
	neck_flexors: { kind: TARGET_KIND.muscle },
	neck_lateral: { kind: TARGET_KIND.muscle },
	neck_rotators: { kind: TARGET_KIND.muscle },
	obliques: { kind: TARGET_KIND.muscle },
	plantar: { kind: TARGET_KIND.muscle },
	quadratus: { alias: 'quadratus_lumborum', kind: TARGET_KIND.muscle },
	quads_c: { kind: TARGET_KIND.muscle },
	rectus: { alias: 'rectus_abdominis', kind: TARGET_KIND.muscle },
	rhomboids: { alias: 'rhomboids', kind: TARGET_KIND.muscle },
	rotator_cuff: { kind: TARGET_KIND.muscle },
	scapula: { alias: 'scapulothoracic', kind: TARGET_KIND.joint },
	t_spine: { alias: 'thoracic_spine', kind: TARGET_KIND.joint },
	tibialis: { alias: 'tibialis_anterior', kind: TARGET_KIND.muscle },
	traps_mid_low: { kind: TARGET_KIND.muscle_head },
	traps_upper: { alias: 'trapezius_upper', kind: TARGET_KIND.muscle_head },
	triceps: { alias: 'triceps_brachii', kind: TARGET_KIND.muscle },
	wrist: { alias: 'wrist', kind: TARGET_KIND.joint }
};

export type TargetKind = (typeof TARGET_KIND)[keyof typeof TARGET_KIND];

export const DICTIONARY_TARGET_KIND: ReadonlyMap<string, TargetKind> = aliasedKinds();

function aliasedKinds(): ReadonlyMap<string, TargetKind> {
	const kinds = new Map<string, TargetKind>();
	for (const entry of Object.values(CATALOG_TARGETS))
		if (entry.alias !== undefined) kinds.set(entry.alias, entry.kind);
	return kinds;
}
