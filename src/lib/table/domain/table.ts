const UNIT_SEPARATOR = '\u{1F}';

export const TABLE_NAME = {
	equipment: 'equipment',
	exercise: 'exercise',
	exercise_equipment: 'exercise_equipment',
	exercise_source: 'exercise_source',
	exercise_target: 'exercise_target',
	muscle_group: 'muscle_group',
	target: 'target'
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
	}
];

export function keyOf(row: Readonly<Record<string, unknown>>, columns: readonly string[]): string {
	return columns.map((column) => String(row[column])).join(UNIT_SEPARATOR);
}

export function schemaOf(name: TableName): TableSchema {
	const found = TABLE_SCHEMAS.find((schema) => schema.name === name);
	if (found === undefined) throw new TypeError(name);
	return found;
}

export function tableNames(): readonly TableName[] {
	return TABLE_SCHEMAS.map((schema) => schema.name);
}

export function tupleOf(name: TableName, row: Row): Row {
	return Object.fromEntries(
		schemaOf(name).columns.map((column) => [column, row[column] ?? null])
	);
}
