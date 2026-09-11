import type { TableGateways } from './table-gateways.ts';

import { tablesOf } from '../domain/convert.ts';
import { tableNames } from '../domain/table.ts';

export interface WriteReport {
	readonly files: readonly WrittenTable[];
	readonly rowCount: number;
}

interface WrittenTable {
	readonly name: string;
	readonly rowCount: number;
}

export function writeTables(gateways: TableGateways): WriteReport {
	const tables = tablesOf(gateways.catalog.readSourceCatalog());
	gateways.tables.writeAll(tables);
	const files = tableNames().map((name) => ({ name, rowCount: tables[name].length }));
	return { files, rowCount: files.reduce((total, file) => total + file.rowCount, 0) };
}
