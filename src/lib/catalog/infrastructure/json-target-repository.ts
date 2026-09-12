import type { TargetRepository } from '../application/target-repository.ts';
import type { Target } from '../domain/target.ts';
import type { SchemaValidator } from './json-schema-validator.ts';

import { readJsonArray } from './json-file.ts';

const TARGET_SCHEMA_ID = 'target.schema.json';
const ITEM_MARK = '#';

export interface JsonTargetSource {
	readonly file: string;
	readonly validator: SchemaValidator;
}

const assertTarget: (
	validator: SchemaValidator,
	value: unknown,
	subject: string
) => asserts value is Target = (validator, value, subject) => {
	validator.assertValid(TARGET_SCHEMA_ID, value, subject);
};

export const createJsonTargetRepository = (source: JsonTargetSource): TargetRepository => ({
	readAll: (): readonly Target[] =>
		readJsonArray(source.file).map((item, at) => {
			assertTarget(source.validator, item, `${source.file}${ITEM_MARK}${String(at)}`);
			return item;
		})
});
