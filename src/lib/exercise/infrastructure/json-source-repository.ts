import type { SourceRepository } from '../application/source-repository.ts';
import type { Source } from '../domain/source.ts';
import type { SchemaValidator } from './json-schema-validator.ts';

import { readJsonArray } from './json-file.ts';

const SOURCE_SCHEMA_ID = 'source.schema.json';
const ITEM_MARK = '#';

export interface JsonSourceSource {
	readonly file: string;
	readonly validator: SchemaValidator;
}

const assertSource: (
	validator: SchemaValidator,
	value: unknown,
	subject: string
) => asserts value is Source = (validator, value, subject) => {
	validator.assertValid(SOURCE_SCHEMA_ID, value, subject);
};

export const createJsonSourceRepository = (source: JsonSourceSource): SourceRepository => ({
	readAll: (): readonly Source[] =>
		readJsonArray(source.file).map((item, at) => {
			assertSource(source.validator, item, `${source.file}${ITEM_MARK}${String(at)}`);
			return item;
		})
});
