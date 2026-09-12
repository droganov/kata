const UNIT_SEPARATOR = '\u{1F}';

export const TABLE_NAME = {
	block: 'block',
	block_draw: 'block_draw',
	block_excluded: 'block_excluded',
	block_pair: 'block_pair',
	block_pin_group: 'block_pin_group',
	block_pin_target: 'block_pin_target',
	block_rule: 'block_rule',
	equipment: 'equipment',
	exercise: 'exercise',
	exercise_equipment: 'exercise_equipment',
	exercise_source: 'exercise_source',
	exercise_target: 'exercise_target',
	goal: 'goal',
	muscle_group: 'muscle_group',
	oracle: 'oracle',
	oracle_line: 'oracle_line',
	person: 'person',
	program: 'program',
	program_goal: 'program_goal',
	program_hip_plane: 'program_hip_plane',
	program_outside_gym: 'program_outside_gym',
	program_progression: 'program_progression',
	program_timing: 'program_timing',
	program_volume: 'program_volume',
	prototype_bank: 'prototype_bank',
	prototype_contour: 'prototype_contour',
	prototype_contour_exercise: 'prototype_contour_exercise',
	prototype_pairing: 'prototype_pairing',
	prototype_program: 'prototype_program',
	prototype_section: 'prototype_section',
	prototype_slot: 'prototype_slot',
	prototype_slot_exercise: 'prototype_slot_exercise',
	prototype_target: 'prototype_target',
	prototype_zone: 'prototype_zone',
	step: 'step',
	step_target: 'step_target',
	target: 'target',
	target_group: 'target_group',
	verdict: 'verdict',
	verdict_line: 'verdict_line'
} as const;

export type Row = Readonly<Record<string, Scalar>>;

export type TableName = (typeof TABLE_NAME)[keyof typeof TABLE_NAME];

export type Tables = Readonly<Record<TableName, readonly Row[]>>;

export interface TableSchema {
	readonly columns: readonly string[];
	readonly foreignKeys: readonly ForeignKey[];
	readonly name: TableName;
	readonly primaryKey: readonly string[];
	readonly unique: readonly (readonly string[])[];
}

interface ForeignKey {
	readonly column: string;
	readonly isNullable?: boolean;
	readonly references: string;
	readonly table: TableName;
}

type Scalar = boolean | null | number | string;

const ID = 'id';

const toId = (column: string, table: TableName): ForeignKey => ({
	column,
	references: ID,
	table
});

const toNullableId = (column: string, table: TableName): ForeignKey => ({
	column,
	isNullable: true,
	references: ID,
	table
});

export const TABLE_SCHEMAS: readonly TableSchema[] = [
	{
		columns: ['id', 'slug', 'name', 'ord'],
		foreignKeys: [],
		name: TABLE_NAME.muscle_group,
		primaryKey: ['id'],
		unique: [['slug'], ['ord']]
	},
	{
		columns: ['id', 'slug'],
		foreignKeys: [],
		name: TABLE_NAME.target_group,
		primaryKey: ['id'],
		unique: [['slug']]
	},
	{
		columns: ['id', 'muscle_group_id', 'target_group_id', 'slug', 'name', 'latin', 'kind'],
		foreignKeys: [
			toNullableId('muscle_group_id', TABLE_NAME.muscle_group),
			toNullableId('target_group_id', TABLE_NAME.target_group)
		],
		name: TABLE_NAME.target,
		primaryKey: ['id'],
		unique: [['slug'], ['muscle_group_id', 'slug']]
	},
	{
		columns: ['id', 'slug', 'name', 'canon_en', 'kind'],
		foreignKeys: [],
		name: TABLE_NAME.equipment,
		primaryKey: ['id'],
		unique: [['slug']]
	},
	{
		columns: ['id', 'slug', 'name'],
		foreignKeys: [],
		name: TABLE_NAME.goal,
		primaryKey: ['id'],
		unique: [['slug']]
	},
	{
		columns: [
			'id',
			'slug',
			'name',
			'modality',
			'catalog_target_id',
			'dose',
			'note',
			'axial',
			'lumbar_flex',
			'lumbar_ext',
			'free_weight',
			'kg_max',
			'seconds',
			'met',
			'core_plane',
			'hip_plane',
			'goal_id'
		],
		foreignKeys: [
			toId('catalog_target_id', TABLE_NAME.target),
			toNullableId('goal_id', TABLE_NAME.goal)
		],
		name: TABLE_NAME.exercise,
		primaryKey: ['id'],
		unique: [['slug']]
	},
	{
		columns: ['exercise_id', 'target_id', 'role'],
		foreignKeys: [
			toId('exercise_id', TABLE_NAME.exercise),
			toId('target_id', TABLE_NAME.target)
		],
		name: TABLE_NAME.exercise_target,
		primaryKey: ['exercise_id', 'target_id'],
		unique: []
	},
	{
		columns: ['exercise_id', 'equipment_id', 'role'],
		foreignKeys: [
			toId('exercise_id', TABLE_NAME.exercise),
			toId('equipment_id', TABLE_NAME.equipment)
		],
		name: TABLE_NAME.exercise_equipment,
		primaryKey: ['exercise_id', 'equipment_id'],
		unique: []
	},
	{
		columns: ['id', 'exercise_id', 'title', 'url', 'note'],
		foreignKeys: [toId('exercise_id', TABLE_NAME.exercise)],
		name: TABLE_NAME.exercise_source,
		primaryKey: ['id'],
		unique: [['exercise_id']]
	},
	{
		columns: ['id', 'exercise_id', 'ord', 'title'],
		foreignKeys: [toId('exercise_id', TABLE_NAME.exercise)],
		name: TABLE_NAME.step,
		primaryKey: ['id'],
		unique: [['exercise_id', 'ord']]
	},
	{
		columns: ['step_id', 'target_id'],
		foreignKeys: [toId('step_id', TABLE_NAME.step), toId('target_id', TABLE_NAME.target)],
		name: TABLE_NAME.step_target,
		primaryKey: ['step_id', 'target_id'],
		unique: []
	},
	{
		columns: ['id', 'step_id', 'ord', 'predicate'],
		foreignKeys: [toId('step_id', TABLE_NAME.step)],
		name: TABLE_NAME.oracle,
		primaryKey: ['id'],
		unique: [['step_id', 'ord']]
	},
	{
		columns: ['id', 'oracle_id', 'side', 'ord', 'text'],
		foreignKeys: [toId('oracle_id', TABLE_NAME.oracle)],
		name: TABLE_NAME.oracle_line,
		primaryKey: ['id'],
		unique: [['oracle_id', 'side', 'ord']]
	},
	{
		columns: ['id', 'hash', 'verdict', 'reason'],
		foreignKeys: [],
		name: TABLE_NAME.verdict,
		primaryKey: ['id'],
		unique: [['hash']]
	},
	{
		columns: ['verdict_id', 'line_id'],
		foreignKeys: [
			toId('verdict_id', TABLE_NAME.verdict),
			toId('line_id', TABLE_NAME.oracle_line)
		],
		name: TABLE_NAME.verdict_line,
		primaryKey: ['verdict_id', 'line_id'],
		unique: [['line_id']]
	},
	{
		columns: ['id', 'nickname'],
		foreignKeys: [],
		name: TABLE_NAME.person,
		primaryKey: ['id'],
		unique: []
	},
	{
		columns: [
			'id',
			'person_id',
			'slug',
			'title',
			'sessions_per_week',
			'session_budget_min',
			'no_axial_load',
			'no_lumbar_flexion',
			'no_lumbar_extension',
			'free_weight_kg_max'
		],
		foreignKeys: [toId('person_id', TABLE_NAME.person)],
		name: TABLE_NAME.program,
		primaryKey: ['id'],
		unique: [['person_id', 'slug']]
	},
	{
		columns: ['program_id', 'goal_id', 'priority', 'ord'],
		foreignKeys: [toId('program_id', TABLE_NAME.program), toId('goal_id', TABLE_NAME.goal)],
		name: TABLE_NAME.program_goal,
		primaryKey: ['program_id', 'goal_id'],
		unique: [['program_id', 'priority', 'ord']]
	},
	{
		columns: ['program_id', 'key', 'sec'],
		foreignKeys: [toId('program_id', TABLE_NAME.program)],
		name: TABLE_NAME.program_timing,
		primaryKey: ['program_id', 'key'],
		unique: []
	},
	{
		columns: ['program_id', 'target_group_id', 'min_sets', 'max_sets'],
		foreignKeys: [
			toId('program_id', TABLE_NAME.program),
			toId('target_group_id', TABLE_NAME.target_group)
		],
		name: TABLE_NAME.program_volume,
		primaryKey: ['program_id', 'target_group_id'],
		unique: []
	},
	{
		columns: ['program_id', 'key', 'text'],
		foreignKeys: [toId('program_id', TABLE_NAME.program)],
		name: TABLE_NAME.program_progression,
		primaryKey: ['program_id', 'key'],
		unique: []
	},
	{
		columns: ['program_id', 'key', 'name', 'minutes', 'per_week', 'intensity'],
		foreignKeys: [toId('program_id', TABLE_NAME.program)],
		name: TABLE_NAME.program_outside_gym,
		primaryKey: ['program_id', 'key'],
		unique: []
	},
	{
		columns: ['program_id', 'hip_plane', 'ord'],
		foreignKeys: [toId('program_id', TABLE_NAME.program)],
		name: TABLE_NAME.program_hip_plane,
		primaryKey: ['program_id', 'hip_plane'],
		unique: [['program_id', 'ord']]
	},
	{
		columns: ['id', 'program_id', 'ord', 'slug', 'name', 'modality', 'budget_sec'],
		foreignKeys: [toId('program_id', TABLE_NAME.program)],
		name: TABLE_NAME.block,
		primaryKey: ['id'],
		unique: [
			['program_id', 'ord'],
			['program_id', 'slug']
		]
	},
	{
		columns: ['block_id', 'muscle_group_id', 'ord', 'pick'],
		foreignKeys: [
			toId('block_id', TABLE_NAME.block),
			toId('muscle_group_id', TABLE_NAME.muscle_group)
		],
		name: TABLE_NAME.block_pin_group,
		primaryKey: ['block_id', 'muscle_group_id'],
		unique: []
	},
	{
		columns: ['block_id', 'target_id', 'ord', 'pick', 'sec_each'],
		foreignKeys: [toId('block_id', TABLE_NAME.block), toId('target_id', TABLE_NAME.target)],
		name: TABLE_NAME.block_pin_target,
		primaryKey: ['block_id', 'target_id'],
		unique: []
	},
	{
		columns: ['block_id', 'level', 'count', 'pick_each', 'sec_each'],
		foreignKeys: [toId('block_id', TABLE_NAME.block)],
		name: TABLE_NAME.block_draw,
		primaryKey: ['block_id'],
		unique: []
	},
	{
		columns: ['block_id', 'when_group_id', 'then_target_id'],
		foreignKeys: [
			toId('block_id', TABLE_NAME.block),
			toId('when_group_id', TABLE_NAME.muscle_group),
			toId('then_target_id', TABLE_NAME.target)
		],
		name: TABLE_NAME.block_pair,
		primaryKey: ['block_id', 'when_group_id', 'then_target_id'],
		unique: []
	},
	{
		columns: ['id', 'block_id', 'muscle_group_id', 'ord', 'text'],
		foreignKeys: [
			toId('block_id', TABLE_NAME.block),
			toNullableId('muscle_group_id', TABLE_NAME.muscle_group)
		],
		name: TABLE_NAME.block_rule,
		primaryKey: ['id'],
		unique: [['block_id', 'ord']]
	},
	{
		columns: ['id', 'block_id', 'ord', 'name', 'reason'],
		foreignKeys: [toId('block_id', TABLE_NAME.block)],
		name: TABLE_NAME.block_excluded,
		primaryKey: ['id'],
		unique: [['block_id', 'ord']]
	},
	{
		columns: ['id', 'slug', 'title'],
		foreignKeys: [],
		name: TABLE_NAME.prototype_bank,
		primaryKey: ['id'],
		unique: [['slug']]
	},
	{
		columns: ['block_id', 'bank_id', 'title'],
		foreignKeys: [
			toId('block_id', TABLE_NAME.block),
			toId('bank_id', TABLE_NAME.prototype_bank)
		],
		name: TABLE_NAME.prototype_section,
		primaryKey: ['block_id'],
		unique: [['bank_id']]
	},
	{
		columns: ['id', 'bank_id', 'ord', 'slug', 'title', 'muscle_group_id'],
		foreignKeys: [
			toId('bank_id', TABLE_NAME.prototype_bank),
			toNullableId('muscle_group_id', TABLE_NAME.muscle_group)
		],
		name: TABLE_NAME.prototype_zone,
		primaryKey: ['id'],
		unique: [['bank_id', 'ord']]
	},
	{
		columns: ['id', 'zone_id', 'ord', 'slug', 'title', 'pick', 'target_id'],
		foreignKeys: [
			toId('zone_id', TABLE_NAME.prototype_zone),
			toId('target_id', TABLE_NAME.target)
		],
		name: TABLE_NAME.prototype_contour,
		primaryKey: ['id'],
		unique: [['zone_id', 'ord']]
	},
	{
		columns: ['exercise_id', 'contour_id', 'ord', 'procedure_id'],
		foreignKeys: [
			toId('exercise_id', TABLE_NAME.exercise),
			toId('contour_id', TABLE_NAME.prototype_contour)
		],
		name: TABLE_NAME.prototype_contour_exercise,
		primaryKey: ['exercise_id'],
		unique: [['contour_id', 'ord'], ['procedure_id']]
	},
	{
		columns: [
			'id',
			'block_id',
			'ord',
			'kind',
			'label',
			'pick',
			'rule',
			'sec_each',
			'allow_repeat'
		],
		foreignKeys: [toId('block_id', TABLE_NAME.block)],
		name: TABLE_NAME.prototype_slot,
		primaryKey: ['id'],
		unique: [['block_id', 'ord']]
	},
	{
		columns: ['slot_id', 'ord', 'exercise_id'],
		foreignKeys: [
			toId('slot_id', TABLE_NAME.prototype_slot),
			toId('exercise_id', TABLE_NAME.exercise)
		],
		name: TABLE_NAME.prototype_slot_exercise,
		primaryKey: ['slot_id', 'ord'],
		unique: []
	},
	{
		columns: ['slot_id', 'pairing_ord', 'ord', 'exercise_id'],
		foreignKeys: [
			toId('slot_id', TABLE_NAME.prototype_slot),
			toId('exercise_id', TABLE_NAME.exercise)
		],
		name: TABLE_NAME.prototype_pairing,
		primaryKey: ['slot_id', 'ord'],
		unique: []
	},
	{
		columns: ['program_id', 'rotation_weeks'],
		foreignKeys: [toId('program_id', TABLE_NAME.program)],
		name: TABLE_NAME.prototype_program,
		primaryKey: ['program_id'],
		unique: []
	},
	{
		columns: ['target_id', 'zone', 'kind'],
		foreignKeys: [toId('target_id', TABLE_NAME.target)],
		name: TABLE_NAME.prototype_target,
		primaryKey: ['target_id'],
		unique: []
	}
];

export const keyOf = (row: Readonly<Record<string, unknown>>, columns: readonly string[]): string =>
	columns.map((column) => String(row[column])).join(UNIT_SEPARATOR);

export const schemaOf = (name: string): TableSchema => {
	const found = TABLE_SCHEMAS.find((schema) => schema.name === name);
	if (found === undefined) throw new TypeError(name);
	return found;
};

export const tableNames = (): readonly TableName[] => TABLE_SCHEMAS.map((schema) => schema.name);

export const tupleOf = (name: TableName, row: Row): Row =>
	Object.fromEntries(schemaOf(name).columns.map((column) => [column, row[column] ?? null]));
