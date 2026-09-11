import type { TableSet } from '../domain/table-file.ts';
import type { Tables } from '../domain/table.ts';

export interface TableRepository {
	readAll: () => TableSet;
	writeAll: (tables: Tables) => void;
}
