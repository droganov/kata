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

export function createJsonSourceRepository(source: JsonSourceSource): SourceRepository {
	return {
		readAll: (): readonly Source[] =>
			readJsonArray(source.file).map((item, at) => {
				source.validator.assertValid(
					SOURCE_SCHEMA_ID,
					item,
					`${source.file}${ITEM_MARK}${String(at)}`
				);
				return item as Source;
			})
	};
}
