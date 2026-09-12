import type { Finding } from '../finding.ts';
import type { TableSet } from '../table-file.ts';
import type { TableSchema } from '../table.ts';

import { lineSubject, LIST_SEPARATOR, ruleCheck } from '../finding.ts';
import { fileOf, isPlainObject, isScalar, rowsOf } from '../table-file.ts';
import { keyOf, TABLE_SCHEMAS } from '../table.ts';
import { RULE } from './rule-codes.ts';

const JSONL_SUFFIX = '.jsonl';
const LINE_BREAK = '\n';
const CARRIAGE_RETURN = '\r';
const NESTED = 'массив или вложенный объект';
const PREVIEW_LENGTH = 60;

export const fileNamesMatchTables = (set: TableSet): Finding[] => {
	const declared: ReadonlySet<string> = new Set(TABLE_SCHEMAS.map((schema) => schema.name));
	const present: ReadonlySet<string> = new Set(set.files.map((file) => file.name));
	return [
		...ruleCheck(
			declared.isSubsetOf(present),
			RULE.fileNames,
			JSONL_SUFFIX,
			`нет файлов таблиц: ${[...declared.difference(present)].join(LIST_SEPARATOR)}`
		),
		...ruleCheck(
			present.isSubsetOf(declared),
			RULE.fileNames,
			JSONL_SUFFIX,
			`файлы вне перечня таблиц: ${[...present.difference(declared)].join(LIST_SEPARATOR)}`
		)
	];
};

export const keysMatchColumns = (set: TableSet): Finding[] =>
	TABLE_SCHEMAS.flatMap((schema) =>
		rowsOf(set, schema.name).flatMap((row, at) => {
			const columns: ReadonlySet<string> = new Set(schema.columns);
			const keys: ReadonlySet<string> = new Set(Object.keys(row));
			return ruleCheck(
				keys.symmetricDifference(columns).size === 0,
				RULE.tupleKeys,
				lineSubject(schema.name, at),
				`лишние ${[...keys.difference(columns)].join(LIST_SEPARATOR)}, недостающие ${[...columns.difference(keys)].join(LIST_SEPARATOR)}`
			);
		})
	);

export const linesAreTuples = (set: TableSet): Finding[] =>
	set.files.flatMap((file) =>
		file.lines.flatMap((line) => [
			...ruleCheck(
				isPlainObject(line.parsed),
				RULE.tuple,
				lineSubject(file.name, line.at - 1),
				`строка не объект JSON: ${line.text.slice(0, PREVIEW_LENGTH)}`
			),
			...ruleCheck(
				!line.text.includes(LINE_BREAK) && !line.text.includes(CARRIAGE_RETURN),
				RULE.tuple,
				lineSubject(file.name, line.at - 1),
				`в кортеже перевод строки`
			)
		])
	);

export const primaryKeysIdentifyRows = (set: TableSet): Finding[] =>
	TABLE_SCHEMAS.flatMap((schema) => primaryKeyFindings(schema, set));

export const valuesAreScalar = (set: TableSet): Finding[] =>
	TABLE_SCHEMAS.flatMap((schema) =>
		rowsOf(set, schema.name).flatMap((row, at) =>
			Object.entries(row)
				.filter(([, value]) => !isScalar(value))
				.map(([column]) => ({
					message: `${column}: ${NESTED}`,
					rule: RULE.scalar,
					subject: lineSubject(schema.name, at)
				}))
		)
	);

const primaryKeyFindings = (schema: TableSchema, set: TableSet): Finding[] => {
	if (fileOf(set, schema.name) === undefined) return [];
	const seen = new Set<string>();
	return rowsOf(set, schema.name).flatMap((row, at) => {
		const blank = schema.primaryKey.filter((column) => (row[column] ?? null) === null);
		const key = keyOf(row, schema.primaryKey);
		const isRepeated = seen.has(key);
		seen.add(key);
		return [
			...ruleCheck(
				blank.length === 0,
				RULE.primaryKey,
				lineSubject(schema.name, at),
				`первичный ключ пуст: ${blank.join(LIST_SEPARATOR)}`
			),
			...ruleCheck(
				!isRepeated,
				RULE.primaryKey,
				lineSubject(schema.name, at),
				`первичный ключ повторён: ${key}`
			)
		];
	});
};
