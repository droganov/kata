import type { BankView, EquipmentView, TargetView } from '../application/catalog-views.ts';
import type { CatalogReport } from '../application/validate-catalog.ts';

import { findEquipment } from '../application/find-equipment.ts';
import { findTargets } from '../application/find-targets.ts';
import { listBanks } from '../application/list-banks.ts';
import { validateCatalog } from '../application/validate-catalog.ts';
import { CATALOG_PATHS } from '../infrastructure/catalog-paths.ts';
import { createJsonBankRepository } from '../infrastructure/json-bank-repository.ts';
import { createJsonEquipmentRepository } from '../infrastructure/json-equipment-repository.ts';
import { createSchemaValidator } from '../infrastructure/json-schema-validator.ts';
import { createJsonTargetRepository } from '../infrastructure/json-target-repository.ts';

export interface CatalogUseCases {
	findEquipment: (ids?: readonly string[]) => EquipmentView[];
	findTargets: (ids?: readonly string[]) => TargetView[];
	listBanks: () => BankView[];
	validateCatalog: () => CatalogReport;
}

export function createCatalog(): CatalogUseCases {
	const validator = createSchemaValidator(CATALOG_PATHS.schema);
	const repositories = {
		banks: createJsonBankRepository({ directory: CATALOG_PATHS.banks, validator }),
		equipment: createJsonEquipmentRepository({ file: CATALOG_PATHS.equipment, validator }),
		targets: createJsonTargetRepository({ file: CATALOG_PATHS.targets, validator })
	};
	return {
		findEquipment: (ids) => findEquipment(repositories.equipment, ids),
		findTargets: (ids) => findTargets(repositories.targets, ids),
		listBanks: () => listBanks(repositories.banks),
		validateCatalog: () => validateCatalog(repositories)
	};
}
