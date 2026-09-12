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

const assertCatalogEquipment: (
	validator: SchemaValidator,
	value: unknown,
	subject: string
) => asserts value is CatalogEquipment = (validator, value, subject) => {
	validator.assertValid(EQUIPMENT_SCHEMA_ID, value, subject);
};

const assertCatalogTarget: (
	validator: SchemaValidator,
	value: unknown,
	subject: string
) => asserts value is CatalogTarget = (validator, value, subject) => {
	validator.assertValid(TARGET_SCHEMA_ID, value, subject);
};

const equipmentItems = (source: CatalogJsonSource): readonly CatalogEquipment[] =>
	readJsonArray(source.equipmentFile).map((item, at) => {
		const subject = `${source.equipmentFile}${ITEM_MARK}${String(at)}`;
		assertCatalogEquipment(source.validator, item, subject);
		return item;
	});

const targetItems = (source: CatalogJsonSource): readonly CatalogTarget[] =>
	readJsonArray(source.targetsFile).map((item, at) => {
		const subject = `${source.targetsFile}${ITEM_MARK}${String(at)}`;
		assertCatalogTarget(source.validator, item, subject);
		return item;
	});

export const createCatalogJsonGateway = (source: CatalogJsonSource): CatalogGateway => ({
	readEquipment: () =>
		findEquipment({ readAll: (): readonly CatalogEquipment[] => equipmentItems(source) }),
	readTargets: () => findTargets({ readAll: (): readonly CatalogTarget[] => targetItems(source) })
});
