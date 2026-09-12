const UNIT_SEPARATOR = '\u{1F}';

export const TABLE_NAME = {
	block: 'block',
	block_draw: 'block_draw',
	block_pin_group: 'block_pin_group',
	block_pin_target: 'block_pin_target',
	equipment: 'equipment',
	exercise: 'exercise',
	exercise_equipment: 'exercise_equipment',
	exercise_source: 'exercise_source',
	exercise_target: 'exercise_target',
	muscle_group: 'muscle_group',
	oracle: 'oracle',
	oracle_line: 'oracle_line',
	program: 'program',
	step: 'step',
	step_target: 'step_target',
	target: 'target',
	verdict: 'verdict'
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
	readonly references: string;
	readonly table: TableName;
}

type Scalar = boolean | null | number | string;

export const TABLE_SCHEMAS: readonly TableSchema[] = [
	{
		columns: ['id', 'slug', 'name', 'ord'],
		foreignKeys: [],
		name: TABLE_NAME.muscle_group,
		primaryKey: ['id'],
		unique: [['slug'], ['ord']]
	},
	{
		columns: ['id', 'muscle_group_id', 'slug', 'name', 'latin', 'kind'],
		foreignKeys: [
			{ column: 'muscle_group_id', references: 'id', table: TABLE_NAME.muscle_group }
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
			'kg_max'
		],
		foreignKeys: [{ column: 'catalog_target_id', references: 'id', table: TABLE_NAME.target }],
		name: TABLE_NAME.exercise,
		primaryKey: ['id'],
		unique: [['slug']]
	},
	{
		columns: ['exercise_id', 'target_id', 'role'],
		foreignKeys: [
			{ column: 'exercise_id', references: 'id', table: TABLE_NAME.exercise },
			{ column: 'target_id', references: 'id', table: TABLE_NAME.target }
		],
		name: TABLE_NAME.exercise_target,
		primaryKey: ['exercise_id', 'target_id'],
		unique: []
	},
	{
		columns: ['exercise_id', 'equipment_id', 'role'],
		foreignKeys: [
			{ column: 'exercise_id', references: 'id', table: TABLE_NAME.exercise },
			{ column: 'equipment_id', references: 'id', table: TABLE_NAME.equipment }
		],
		name: TABLE_NAME.exercise_equipment,
		primaryKey: ['exercise_id', 'equipment_id'],
		unique: []
	},
	{
		columns: ['id', 'exercise_id', 'title', 'url', 'note'],
		foreignKeys: [{ column: 'exercise_id', references: 'id', table: TABLE_NAME.exercise }],
		name: TABLE_NAME.exercise_source,
		primaryKey: ['id'],
		unique: [['exercise_id']]
	},
	{
		columns: ['id', 'exercise_id', 'ord', 'title'],
		foreignKeys: [{ column: 'exercise_id', references: 'id', table: TABLE_NAME.exercise }],
		name: TABLE_NAME.step,
		primaryKey: ['id'],
		unique: [['exercise_id', 'ord']]
	},
	{
		columns: ['step_id', 'target_id'],
		foreignKeys: [
			{ column: 'step_id', references: 'id', table: TABLE_NAME.step },
			{ column: 'target_id', references: 'id', table: TABLE_NAME.target }
		],
		name: TABLE_NAME.step_target,
		primaryKey: ['step_id', 'target_id'],
		unique: []
	},
	{
		columns: ['id', 'step_id', 'ord', 'predicate'],
		foreignKeys: [{ column: 'step_id', references: 'id', table: TABLE_NAME.step }],
		name: TABLE_NAME.oracle,
		primaryKey: ['id'],
		unique: [['step_id', 'ord']]
	},
	{
		columns: ['id', 'oracle_id', 'side', 'ord', 'text'],
		foreignKeys: [{ column: 'oracle_id', references: 'id', table: TABLE_NAME.oracle }],
		name: TABLE_NAME.oracle_line,
		primaryKey: ['id'],
		unique: [['oracle_id', 'side', 'ord']]
	},
	{
		columns: ['id', 'line_id', 'hash', 'verdict', 'reason'],
		foreignKeys: [{ column: 'line_id', references: 'id', table: TABLE_NAME.oracle_line }],
		name: TABLE_NAME.verdict,
		primaryKey: ['id'],
		unique: [['line_id']]
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
		foreignKeys: [],
		name: TABLE_NAME.program,
		primaryKey: ['id'],
		unique: [['person_id', 'slug']]
	},
	{
		columns: ['id', 'program_id', 'ord', 'name', 'modality'],
		foreignKeys: [{ column: 'program_id', references: 'id', table: TABLE_NAME.program }],
		name: TABLE_NAME.block,
		primaryKey: ['id'],
		unique: [['program_id', 'ord']]
	},
	{
		columns: ['block_id', 'muscle_group_id', 'ord', 'pick'],
		foreignKeys: [
			{ column: 'block_id', references: 'id', table: TABLE_NAME.block },
			{ column: 'muscle_group_id', references: 'id', table: TABLE_NAME.muscle_group }
		],
		name: TABLE_NAME.block_pin_group,
		primaryKey: ['block_id', 'muscle_group_id'],
		unique: []
	},
	{
		columns: ['block_id', 'target_id', 'ord', 'pick'],
		foreignKeys: [
			{ column: 'block_id', references: 'id', table: TABLE_NAME.block },
			{ column: 'target_id', references: 'id', table: TABLE_NAME.target }
		],
		name: TABLE_NAME.block_pin_target,
		primaryKey: ['block_id', 'target_id'],
		unique: []
	},
	{
		columns: ['block_id', 'level', 'count', 'pick_each'],
		foreignKeys: [{ column: 'block_id', references: 'id', table: TABLE_NAME.block }],
		name: TABLE_NAME.block_draw,
		primaryKey: ['block_id'],
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
