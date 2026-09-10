import type { EquipmentRepository } from '../../catalog/application/equipment-repository.ts';
import type { TargetRepository } from '../../catalog/application/target-repository.ts';
import type { CatalogGateway } from '../application/catalog-gateway.ts';
import type { SchemaValidator } from './json-schema-validator.ts';

import { findEquipment } from '../../catalog/application/find-equipment.ts';
import { findTargets } from '../../catalog/application/find-targets.ts';
import { readJsonArray } from './json-file.ts';

const EQUIPMENT_SCHEMA_ID = 'equipment.schema.json';
const TARGET_SCHEMA_ID = 'target.schema.json';
const ITEM_MARK = '#';

export interface CatalogJsonSource {
	readonly equipmentFile: string;
	readonly targetsFile: string;
	readonly validator: SchemaValidator;
}

type CatalogEquipment = ReturnType<EquipmentRepository['readAll']>[number];

type CatalogTarget = ReturnType<TargetRepository['readAll']>[number];

export function createCatalogJsonGateway(source: CatalogJsonSource): CatalogGateway {
	return {
		readEquipment: () =>
			findEquipment({
				readAll: (): readonly CatalogEquipment[] =>
					validatedItems(
						source.equipmentFile,
						EQUIPMENT_SCHEMA_ID,
						source.validator
					) as readonly CatalogEquipment[]
			}),
		readTargets: () =>
			findTargets({
				readAll: (): readonly CatalogTarget[] =>
					validatedItems(
						source.targetsFile,
						TARGET_SCHEMA_ID,
						source.validator
					) as readonly CatalogTarget[]
			})
	};
}

function validatedItems(
	file: string,
	schemaId: string,
	validator: SchemaValidator
): readonly unknown[] {
	return readJsonArray(file).map((item, at) => {
		validator.assertValid(schemaId, item, `${file}${ITEM_MARK}${String(at)}`);
		return item;
	});
}
