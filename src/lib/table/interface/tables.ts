import type { TableReport } from '../application/validate-tables.ts';
import type { WriteReport } from '../application/write-tables.ts';

import { validateTables } from '../application/validate-tables.ts';
import { writeTables } from '../application/write-tables.ts';
import { createCatalogJsonGateway } from '../infrastructure/catalog-json-gateway.ts';
import { createSchemaValidator } from '../infrastructure/json-schema-validator.ts';
import { createJsonlTableRepository } from '../infrastructure/jsonl-table-repository.ts';
import { TABLE_PATHS } from '../infrastructure/table-paths.ts';

export interface TableUseCases {
	validateTables: () => TableReport;
	writeTables: () => WriteReport;
}

export const createTables = (): TableUseCases => {
	const validator = createSchemaValidator(TABLE_PATHS.schema);
	const gateways = {
		catalog: createCatalogJsonGateway({
			equipmentFile: TABLE_PATHS.equipment,
			modalityDirectory: TABLE_PATHS.modalities,
			referencesFile: TABLE_PATHS.references,
			targetsFile: TABLE_PATHS.targets,
			validator,
			verdictsFile: TABLE_PATHS.verdicts
		}),
		tables: createJsonlTableRepository({ directory: TABLE_PATHS.tables })
	};
	return {
		validateTables: () => validateTables(gateways),
		writeTables: () => writeTables(gateways)
	};
};
