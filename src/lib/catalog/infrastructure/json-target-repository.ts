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

export function createJsonTargetRepository(source: JsonTargetSource): TargetRepository {
	return {
		readAll: (): readonly Target[] =>
			readJsonArray(source.file).map((item, at) => {
				source.validator.assertValid(
					TARGET_SCHEMA_ID,
					item,
					`${source.file}${ITEM_MARK}${String(at)}`
				);
				return item as Target;
			})
	};
}
