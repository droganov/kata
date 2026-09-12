import type { Finding } from '../finding.ts';
import type { SourceCatalog } from '../source-catalog.ts';
import type { TableSet } from '../table-file.ts';

import { tablesOf } from '../convert.ts';
import { lineSubject, LIST_SEPARATOR, ruleCheck, slugSubject } from '../finding.ts';
import { canonicalOf, restoredDocumentsOf, SET_PATHS } from '../source-restore.ts';
import { rowsOf, textAt } from '../table-file.ts';
import { keyOf, TABLE_NAME, TABLE_SCHEMAS } from '../table.ts';
import { TARGET_KIND } from '../target-map.ts';
import { RULE } from './rule-codes.ts';

const COLUMN_KIND = 'kind';
const COLUMN_GROUP = 'muscle_group_id';
const COLUMN_SLUG = 'slug';
const EXCERPT_RADIUS = 60;
const ELLIPSIS = '…';
const NOT_EQUAL = ' ≠ ';

export const systemTargetsOutsideGroups = (set: TableSet): Finding[] =>
	rowsOf(set, TABLE_NAME.target).flatMap((row) =>
		ruleCheck(
			(textAt(row, COLUMN_KIND) === TARGET_KIND.system) ===
				((row[COLUMN_GROUP] ?? null) === null),
			RULE.system,
			slugSubject(TABLE_NAME.target, textAt(row, COLUMN_SLUG)),
			`вид ${textAt(row, COLUMN_KIND)}, группа мышц ${textAt(row, COLUMN_GROUP)}`
		)
	);

export const tablesMatchConversion = (set: TableSet, catalog: SourceCatalog): Finding[] => {
	const converted = tablesOf(catalog);
	return TABLE_SCHEMAS.flatMap((schema) => {
		const expected = new Set(converted[schema.name].map((row) => keyOf(row, schema.columns)));
		const actual = rowsOf(set, schema.name).map((row) => keyOf(row, schema.columns));
		const present = new Set(actual);
		const extra = actual.flatMap((key, at) =>
			expected.has(key) ? [] : [lineSubject(schema.name, at)]
		);
		const missing = expected
			.values()
			.filter((key) => !present.has(key))
			.toArray().length;
		return [
			...ruleCheck(
				missing === 0,
				RULE.converted,
				schema.name,
				`строк конвертации нет в таблице: ${String(missing)}`
			),
			...ruleCheck(
				extra.length === 0,
				RULE.converted,
				schema.name,
				`строки не из конвертации: ${extra.join(LIST_SEPARATOR)}`
			)
		];
	});
};

export const tablesRestoreSources = (set: TableSet, catalog: SourceCatalog): Finding[] =>
	restoredDocumentsOf(set, catalog.documents).flatMap(({ document, restored }) => {
		const sets = SET_PATHS[document.kind] ?? new Set<string>();
		const expected = JSON.stringify(canonicalOf(document.value, sets) ?? null);
		const actual = JSON.stringify(canonicalOf(restored, sets) ?? null);
		return ruleCheck(
			expected === actual,
			RULE.restore,
			document.name,
			`не восстанавливается из таблиц: ${divergenceOf(expected, actual)}`
		);
	});

const divergenceOf = (expected: string, actual: string): string => {
	let at = 0;
	while (at < expected.length && expected[at] === actual[at]) at += 1;
	const from = Math.max(0, at - EXCERPT_RADIUS);
	const to = at + EXCERPT_RADIUS;
	return ELLIPSIS + expected.slice(from, to) + NOT_EQUAL + actual.slice(from, to) + ELLIPSIS;
};
