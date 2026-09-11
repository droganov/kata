import type { Finding } from '../domain/finding.ts';
import type { TableGateways } from './table-gateways.ts';

import { tableRules } from '../domain/rules/table-rules.ts';
import { rowsOf } from '../domain/table-file.ts';
import { tableNames } from '../domain/table.ts';

export interface TableReport {
	readonly failureCount: number;
	readonly findings: readonly Finding[];
	readonly tables: readonly TableCount[];
}

interface TableCount {
	readonly name: string;
	readonly rowCount: number;
}

export function validateTables(gateways: TableGateways): TableReport {
	const set = gateways.tables.readAll();
	const catalog = gateways.catalog.readSourceCatalog();
	const findings = tableRules().flatMap((rule) => rule(set, catalog));
	return {
		failureCount: findings.length,
		findings,
		tables: tableNames().map((name) => ({ name, rowCount: rowsOf(set, name).length }))
	};
}
