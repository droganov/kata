import type { AnySchemaObject } from 'ajv';

import { Ajv } from 'ajv';
import addFormats from 'ajv-formats';
import { readdirSync } from 'node:fs';
import path from 'node:path';

import { readJsonFile } from './json-file.ts';

const SCHEMA_SUFFIX = '.schema.json';
const OBJECT_TYPE = 'object';

export interface SchemaValidator {
	assertValid: (schemaId: string, value: unknown, subject: string) => void;
}

const isSchemaObject = (value: unknown): value is AnySchemaObject =>
	typeof value === OBJECT_TYPE && value !== null && !Array.isArray(value);

export const createSchemaValidator = (schemaDirectory: string): SchemaValidator => {
	const ajv = new Ajv({ allErrors: true });
	addFormats(ajv);
	const files = readdirSync(schemaDirectory).filter((name) => name.endsWith(SCHEMA_SUFFIX));
	for (const file of files) {
		const schema = readJsonFile(path.join(schemaDirectory, file));
		if (!isSchemaObject(schema)) throw new TypeError(`${file}: схема не объект JSON`);
		ajv.addSchema(schema);
	}
	return {
		assertValid: (schemaId: string, value: unknown, subject: string): void => {
			const check = ajv.getSchema(schemaId);
			if (check === undefined) throw new Error(`${subject}: нет схемы ${schemaId}`);
			if (!check(value)) throw new Error(`${subject}: ${ajv.errorsText(check.errors)}`);
		}
	};
};
