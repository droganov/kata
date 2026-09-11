import type { Finding } from '../finding.ts';
import type { RawRow, TableSet } from '../table-file.ts';

import { lineSubject, LIST_SEPARATOR, ruleCheck } from '../finding.ts';
import { rowsOf, textAt } from '../table-file.ts';
import { keyOf, TABLE_SCHEMAS } from '../table.ts';
import { RULE } from './rule-codes.ts';

const COLUMN_MARK = '.';

export function foreignKeysResolve(set: TableSet): Finding[] {
	const keys = keySets(set);
	return TABLE_SCHEMAS.flatMap((schema) =>
		schema.foreignKeys.flatMap((foreignKey) => {
			const known = keys.get(`${foreignKey.table}${COLUMN_MARK}${foreignKey.references}`);
			return rowsOf(set, schema.name).flatMap((row, at) =>
				ruleCheck(
					known?.has(textAt(row, foreignKey.column)) === true,
					RULE.reference,
					lineSubject(schema.name, at),
					`${foreignKey.column} не ведёт в ${foreignKey.table}: ${textAt(row, foreignKey.column)}`
				)
			);
		})
	);
}

export function uniqueKeysHold(set: TableSet): Finding[] {
	return TABLE_SCHEMAS.flatMap((schema) =>
		schema.unique.flatMap((columns) =>
			repeatedFindings(schema.name, columns, rowsOf(set, schema.name))
		)
	);
}

function keySets(set: TableSet): ReadonlyMap<string, ReadonlySet<string>> {
	const keys = new Map<string, ReadonlySet<string>>();
	for (const schema of TABLE_SCHEMAS) {
		const rows = rowsOf(set, schema.name);
		for (const column of schema.columns)
			keys.set(
				`${schema.name}${COLUMN_MARK}${column}`,
				new Set(rows.map((row) => textAt(row, column)))
			);
	}
	return keys;
}

function repeatedFindings(
	table: string,
	columns: readonly string[],
	rows: readonly RawRow[]
): Finding[] {
	const seen = new Set<string>();
	const findings: Finding[] = [];
	for (const [at, row] of rows.entries()) {
		const key = keyOf(row, columns);
		if (seen.has(key))
			findings.push({
				message: `${columns.join(LIST_SEPARATOR)} повторены: ${key}`,
				rule: RULE.unique,
				subject: lineSubject(table, at)
			});
		seen.add(key);
	}
	return findings;
}
