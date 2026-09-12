import type { SourceDocument } from './source-catalog.ts';
import type { RawRow, TableSet } from './table-file.ts';
import type { TableName } from './table.ts';

import { isPlainObject, rowsOf } from './table-file.ts';
import { TABLE_NAME } from './table.ts';

const SECONDS_IN_MINUTE = 60;
const ARRAY_MARK = '[]';
const PATH_SEPARATOR = '.';
const KEY_SEPARATOR = '|';

const PRIORITY = { primary: 'primary', secondary: 'secondary' } as const;
const SIDE = { counter: 'counter', model: 'model' } as const;

const TIMING = {
	hold_rest: 'hold_rest',
	rest_accessory: 'rest_accessory',
	rest_strength: 'rest_strength',
	transition: 'transition',
	warmup_general: 'warmup_general',
	work_per_set: 'work_per_set'
} as const;

const PROGRESSION = {
	drawn: 'drawn',
	isometric: 'isometric',
	pinned: 'pinned',
	stop_rule: 'stop_rule'
} as const;

const COLUMN = {
	bank_id: 'bank_id',
	block_id: 'block_id',
	contour_id: 'contour_id',
	equipment_id: 'equipment_id',
	exercise_id: 'exercise_id',
	id: 'id',
	oracle_id: 'oracle_id',
	person_id: 'person_id',
	program_id: 'program_id',
	slot_id: 'slot_id',
	slug: 'slug',
	step_id: 'step_id',
	zone_id: 'zone_id'
} as const;

const OUTSIDE_GYM_FIELDS: Readonly<Record<string, OutsideGymFields>> = {
	mobility_home: { minutes: 'min_per_day', perWeek: 'days_per_week' },
	walking: { minutes: 'min_per_session', perWeek: 'sessions_per_week' }
};

const PLAIN_OUTSIDE_GYM: OutsideGymFields = { minutes: 'minutes', perWeek: 'per_week' };

export const SET_PATHS: Readonly<Record<string, ReadonlySet<string>>> = {
	banks: new Set([
		'zones[].contours[].exercises[].equipment',
		'zones[].contours[].exercises[].procedure.steps[].active',
		'zones[].contours[].exercises[].targets'
	]),
	equipment: new Set(['', '[].exercises']),
	programs: new Set(['']),
	sources: new Set(['']),
	targets: new Set(['']),
	users: new Set(['', '[].programs']),
	verdicts: new Set([''])
};

export interface RestoredDocument {
	readonly document: SourceDocument;
	readonly restored: unknown;
}

interface Index {
	readonly all: (table: TableName) => readonly RawRow[];
	readonly by: (table: TableName, column: string, key: unknown) => readonly RawRow[];
	readonly one: (table: TableName, column: string, key: unknown) => RawRow;
}

interface OutsideGymFields {
	readonly minutes: string;
	readonly perWeek: string;
}

type Restorer = (index: Index, value: unknown) => unknown;

export const canonicalOf = (value: unknown, sets: ReadonlySet<string>, path = ''): unknown => {
	if (Array.isArray(value)) {
		const items = value.map((item: unknown) => canonicalOf(item, sets, path + ARRAY_MARK));
		return sets.has(path)
			? items.toSorted((first, second) =>
					JSON.stringify(first).localeCompare(JSON.stringify(second))
				)
			: items;
	}
	if (!isPlainObject(value)) return value;
	return Object.fromEntries(
		Object.keys(value)
			.toSorted((first, second) => first.localeCompare(second))
			.map((key) => [key, canonicalOf(value[key], sets, joined(path, key))])
	);
};

export const restoredDocumentsOf = (
	set: TableSet,
	documents: readonly SourceDocument[]
): readonly RestoredDocument[] => {
	const index = indexOf(set);
	return documents.map((document) => ({
		document,
		restored: RESTORERS[document.kind]?.(index, document.value)
	}));
};

const joined = (prefix: string, key: string): string =>
	prefix === '' ? key : prefix + PATH_SEPARATOR + key;

const present = (fields: Readonly<Record<string, unknown>>): Readonly<Record<string, unknown>> =>
	Object.fromEntries(
		Object.entries(fields).filter(([, value]) => value !== null && value !== undefined)
	);

const inOrder = (rows: readonly RawRow[]): readonly RawRow[] =>
	rows.toSorted((first, second) => Number(first.ord ?? 0) - Number(second.ord ?? 0));

const indexOf = (set: TableSet): Index => {
	const cache = new Map<string, ReadonlyMap<string, readonly RawRow[]>>();
	const groupsOf = (table: TableName, column: string): ReadonlyMap<string, readonly RawRow[]> => {
		const cacheKey = table + KEY_SEPARATOR + column;
		const cached = cache.get(cacheKey);
		if (cached !== undefined) return cached;
		const groups = new Map<string, RawRow[]>();
		const ordered = inOrder(rowsOf(set, table));
		for (const row of ordered) {
			const key = String(row[column]);
			const group = groups.get(key);
			if (group === undefined) groups.set(key, [row]);
			else group.push(row);
		}
		cache.set(cacheKey, groups);
		return groups;
	};
	return {
		all: (table) => inOrder(rowsOf(set, table)),
		by: (table, column, key) => groupsOf(table, column).get(String(key)) ?? [],
		one: (table, column, key) => groupsOf(table, column).get(String(key))?.[0] ?? {}
	};
};

const whenAny = <Result>(
	rows: readonly RawRow[],
	build: (rows: readonly RawRow[]) => Result
): Result | undefined => (rows.length === 0 ? undefined : build(rows));

const linesOf = (index: Index, oracle: RawRow, side: string): readonly unknown[] =>
	index
		.by(TABLE_NAME.oracle_line, COLUMN.oracle_id, oracle.id)
		.filter((line) => line.side === side)
		.map((line) => line.text);

const stepOf = (index: Index, step: RawRow): unknown => ({
	active: index.by(TABLE_NAME.step_target, COLUMN.step_id, step.id).map((link) => link.target_id),
	id: step.id,
	oracles: index.by(TABLE_NAME.oracle, COLUMN.step_id, step.id).map((oracle) => ({
		counterModel: linesOf(index, oracle, SIDE.counter),
		id: oracle.id,
		model: linesOf(index, oracle, SIDE.model),
		predicate: oracle.predicate
	})),
	title: step.title
});

const exerciseOf = (index: Index, link: RawRow): unknown => {
	const row = index.one(TABLE_NAME.exercise, COLUMN.id, link.exercise_id);
	return {
		constraints: {
			axial: row.axial,
			free_weight: row.free_weight,
			...present({ kg_max: row.kg_max }),
			lumbar_ext: row.lumbar_ext,
			lumbar_flex: row.lumbar_flex
		},
		dose: row.dose,
		equipment: index
			.by(TABLE_NAME.exercise_equipment, COLUMN.exercise_id, row.id)
			.map((item) => ({ id: item.equipment_id, role: item.role })),
		...present({
			goal: index.one(TABLE_NAME.goal, COLUMN.id, row.goal_id).slug,
			hip_plane: row.hip_plane,
			met: row.met,
			note: row.note,
			plane: row.core_plane,
			seconds: row.seconds
		}),
		id: row.id,
		mode: row.modality,
		name: row.name,
		procedure: {
			id: link.procedure_id,
			steps: index
				.by(TABLE_NAME.step, COLUMN.exercise_id, row.id)
				.map((step) => stepOf(index, step))
		},
		slug: row.slug,
		source: index.one(TABLE_NAME.exercise_source, COLUMN.exercise_id, row.id).id,
		targets: index
			.by(TABLE_NAME.exercise_target, COLUMN.exercise_id, row.id)
			.map((item) => ({ id: item.target_id, role: item.role }))
	};
};

const contourOf = (index: Index, contour: RawRow): unknown => ({
	exercises: index
		.by(TABLE_NAME.prototype_contour_exercise, COLUMN.contour_id, contour.id)
		.map((link) => exerciseOf(index, link)),
	id: contour.id,
	...present({ pick: contour.pick }),
	slug: contour.slug,
	title: contour.title
});

const zoneOf = (index: Index, zone: RawRow, rules: readonly RawRow[]): unknown => ({
	contours: index
		.by(TABLE_NAME.prototype_contour, COLUMN.zone_id, zone.id)
		.map((contour) => contourOf(index, contour)),
	id: zone.id,
	...present({
		rule:
			zone.muscle_group_id === null
				? undefined
				: rules.find((rule) => rule.muscle_group_id === zone.muscle_group_id)?.text
	}),
	slug: zone.slug,
	title: zone.title
});

const bankOf: Restorer = (index, value) => {
	const slug = isPlainObject(value) ? value.slug : undefined;
	const bank = index.one(TABLE_NAME.prototype_bank, COLUMN.slug, slug);
	const section = index.one(TABLE_NAME.prototype_section, COLUMN.bank_id, bank.id);
	const block = index.one(TABLE_NAME.block, COLUMN.id, section.block_id);
	const rules = index.by(TABLE_NAME.block_rule, COLUMN.block_id, block.id);
	return {
		excluded: index
			.by(TABLE_NAME.block_excluded, COLUMN.block_id, block.id)
			.map((item) => ({ name: item.name, reason: item.reason })),
		id: bank.id,
		rules: rules.filter((rule) => rule.muscle_group_id === null).map((rule) => rule.text),
		...present({ session_budget_sec: block.budget_sec }),
		slug: bank.slug,
		title: bank.title,
		zones: index
			.by(TABLE_NAME.prototype_zone, COLUMN.bank_id, bank.id)
			.map((zone) => zoneOf(index, zone, rules))
	};
};

const equipmentOf: Restorer = (index) =>
	index.all(TABLE_NAME.equipment).map((item) => ({
		canon_en: item.canon_en,
		exercises: index
			.by(TABLE_NAME.exercise_equipment, COLUMN.equipment_id, item.id)
			.map((link) => link.exercise_id),
		id: item.id,
		kind: item.kind,
		name: item.name,
		slug: item.slug
	}));

const sourcesOf: Restorer = (index) =>
	index.all(TABLE_NAME.exercise_source).map((source) => ({
		exercise: source.exercise_id,
		id: source.id,
		...present({ note: source.note, url: source.url }),
		title: source.title
	}));

const targetsOf: Restorer = (index) =>
	index.all(TABLE_NAME.prototype_target).map((entry) => {
		const target = index.one(TABLE_NAME.target, COLUMN.id, entry.target_id);
		return {
			...present({
				group: index.one(TABLE_NAME.target_group, COLUMN.id, target.target_group_id).slug
			}),
			id: target.id,
			kind: entry.kind,
			latin: target.latin,
			name: target.name,
			slug: target.slug,
			zone: entry.zone
		};
	});

const usersOf: Restorer = (index) =>
	index.all(TABLE_NAME.person).map((person) => ({
		id: person.id,
		name: person.nickname,
		programs: index
			.by(TABLE_NAME.program, COLUMN.person_id, person.id)
			.map((program) => program.id)
	}));

const verdictsOf: Restorer = (index) =>
	index.all(TABLE_NAME.verdict_line).map((link) => {
		const verdict = index.one(TABLE_NAME.verdict, COLUMN.id, link.verdict_id);
		const line = index.one(TABLE_NAME.oracle_line, COLUMN.id, link.line_id);
		return {
			hash: verdict.hash,
			id: verdict.id,
			line: line.text,
			oracle: line.oracle_id,
			...present({ reason: verdict.reason }),
			verdict: verdict.verdict
		};
	});

const keyedOf = (rows: readonly RawRow[], key: string, column: string): unknown =>
	rows.find((row) => row.key === key)?.[column];

const outsideGymOf = (rows: readonly RawRow[]): unknown =>
	Object.fromEntries(
		rows.map((row) => {
			const fields = OUTSIDE_GYM_FIELDS[String(row.key)] ?? PLAIN_OUTSIDE_GYM;
			return [
				String(row.key),
				{
					...present({ intensity: row.intensity }),
					[fields.minutes]: row.minutes,
					[fields.perWeek]: row.per_week,
					name: row.name
				}
			];
		})
	);

const pairingOf = (index: Index, blocks: readonly RawRow[]): unknown => {
	const rows = blocks
		.flatMap((block) => index.by(TABLE_NAME.prototype_slot, COLUMN.block_id, block.id))
		.flatMap((slot) => index.by(TABLE_NAME.prototype_pairing, COLUMN.slot_id, slot.id))
		.toSorted((first, second) => Number(first.pairing_ord) - Number(second.pairing_ord));
	const groups = new Map<string, RawRow[]>();
	for (const row of rows) {
		const key = String(row.pairing_ord);
		const group = groups.get(key);
		if (group === undefined) groups.set(key, [row]);
		else group.push(row);
	}
	return whenAny(rows, () =>
		groups
			.values()
			.map((group) => ({
				exercises: inOrder(group).map((row) => row.exercise_id),
				slot: group[0]?.slot_id
			}))
			.toArray()
	);
};

const slotOf = (index: Index, slot: RawRow): unknown => ({
	...present({
		allow_repeat: slot.allow_repeat,
		pick: slot.pick,
		rule: slot.rule,
		sec_each: slot.sec_each
	}),
	exercises: index
		.by(TABLE_NAME.prototype_slot_exercise, COLUMN.slot_id, slot.id)
		.map((link) => link.exercise_id),
	id: slot.id,
	kind: slot.kind,
	label: slot.label
});

const sectionOf = (index: Index, block: RawRow): unknown => {
	const section = index.one(TABLE_NAME.prototype_section, COLUMN.block_id, block.id);
	return {
		bank: section.bank_id,
		id: block.id,
		mode: block.modality,
		slots: index
			.by(TABLE_NAME.prototype_slot, COLUMN.block_id, block.id)
			.map((slot) => slotOf(index, slot)),
		slug: block.slug,
		title: section.title
	};
};

const goalsOf = (index: Index, program: RawRow, priority: string): readonly unknown[] =>
	index
		.by(TABLE_NAME.program_goal, COLUMN.program_id, program.id)
		.filter((goal) => goal.priority === priority)
		.map((goal) => index.one(TABLE_NAME.goal, COLUMN.id, goal.goal_id).slug);

const timingOf = (index: Index, program: RawRow): unknown => {
	const rows = index.by(TABLE_NAME.program_timing, COLUMN.program_id, program.id);
	const warmup = keyedOf(rows, TIMING.warmup_general, COLUMN_SEC);
	return {
		hold_rest_sec: keyedOf(rows, TIMING.hold_rest, COLUMN_SEC),
		rest_sec_accessory: keyedOf(rows, TIMING.rest_accessory, COLUMN_SEC),
		rest_sec_strength: keyedOf(rows, TIMING.rest_strength, COLUMN_SEC),
		transition_sec: keyedOf(rows, TIMING.transition, COLUMN_SEC),
		...present({
			warmup_general_min:
				warmup === undefined ? undefined : Number(warmup) / SECONDS_IN_MINUTE
		}),
		work_sec_per_set: keyedOf(rows, TIMING.work_per_set, COLUMN_SEC)
	};
};

const progressionOf = (index: Index, program: RawRow): unknown => {
	const rows = index.by(TABLE_NAME.program_progression, COLUMN.program_id, program.id);
	return {
		base: keyedOf(rows, PROGRESSION.pinned, COLUMN_TEXT),
		isometric: keyedOf(rows, PROGRESSION.isometric, COLUMN_TEXT),
		pool: keyedOf(rows, PROGRESSION.drawn, COLUMN_TEXT),
		stop_rule: keyedOf(rows, PROGRESSION.stop_rule, COLUMN_TEXT)
	};
};

const programOf = (index: Index, program: RawRow): unknown => {
	const blocks = index.by(TABLE_NAME.block, COLUMN.program_id, program.id);
	return {
		contraindications: {
			axial_load: program.no_axial_load,
			free_weight_kg_max: program.free_weight_kg_max,
			loaded_lumbar_extension: program.no_lumbar_extension,
			loaded_lumbar_flexion: program.no_lumbar_flexion
		},
		goals: {
			primary: goalsOf(index, program, PRIORITY.primary),
			secondary: goalsOf(index, program, PRIORITY.secondary)
		},
		...present({
			hip_planes: whenAny(
				index.by(TABLE_NAME.program_hip_plane, COLUMN.program_id, program.id),
				(rows) => rows.map((row) => row.hip_plane)
			),
			outside_gym: whenAny(
				index.by(TABLE_NAME.program_outside_gym, COLUMN.program_id, program.id),
				outsideGymOf
			),
			pairing: pairingOf(index, blocks),
			volume_targets: whenAny(
				index.by(TABLE_NAME.program_volume, COLUMN.program_id, program.id),
				(rows) =>
					Object.fromEntries(
						rows.map((row) => [
							String(
								index.one(TABLE_NAME.target_group, COLUMN.id, row.target_group_id)
									.slug
							),
							{ max: row.max_sets, min: row.min_sets }
						])
					)
			)
		}),
		id: program.id,
		progression: progressionOf(index, program),
		schedule: {
			rotation_weeks: index.one(TABLE_NAME.prototype_program, COLUMN.program_id, program.id)
				.rotation_weeks,
			session_budget_min: program.session_budget_min,
			sessions_per_week: program.sessions_per_week
		},
		sections: blocks.map((block) => sectionOf(index, block)),
		timing: timingOf(index, program),
		title: program.title,
		user: program.person_id
	};
};

const programsOf: Restorer = (index) =>
	index.all(TABLE_NAME.program).map((program) => programOf(index, program));

const COLUMN_SEC = 'sec';
const COLUMN_TEXT = 'text';

const RESTORERS: Readonly<Record<string, Restorer>> = {
	banks: bankOf,
	equipment: equipmentOf,
	programs: programsOf,
	sources: sourcesOf,
	targets: targetsOf,
	users: usersOf,
	verdicts: verdictsOf
};
