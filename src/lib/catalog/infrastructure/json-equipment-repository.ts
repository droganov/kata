import type { EquipmentRepository } from '../application/equipment-repository.ts';
import type { Equipment } from '../domain/equipment.ts';
import type { SchemaValidator } from './json-schema-validator.ts';

import { readJsonArray } from './json-file.ts';

const EQUIPMENT_SCHEMA_ID = 'equipment.schema.json';
const ITEM_MARK = '#';

export interface JsonEquipmentSource {
	readonly file: string;
	readonly validator: SchemaValidator;
}

const assertEquipment: (
	validator: SchemaValidator,
	value: unknown,
	subject: string
) => asserts value is Equipment = (validator, value, subject) => {
	validator.assertValid(EQUIPMENT_SCHEMA_ID, value, subject);
};

export const createJsonEquipmentRepository = (
	source: JsonEquipmentSource
): EquipmentRepository => ({
	readAll: (): readonly Equipment[] =>
		readJsonArray(source.file).map((item, at) => {
			assertEquipment(source.validator, item, `${source.file}${ITEM_MARK}${String(at)}`);
			return item;
		})
});
