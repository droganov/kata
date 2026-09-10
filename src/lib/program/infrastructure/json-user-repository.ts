import type { UserRepository } from '../application/user-repository.ts';
import type { User } from '../domain/program.ts';
import type { SchemaValidator } from './json-schema-validator.ts';

import { readJsonArray } from './json-file.ts';

const USER_SCHEMA_ID = 'user.schema.json';
const ITEM_MARK = '#';

export interface JsonUserSource {
	readonly file: string;
	readonly validator: SchemaValidator;
}

export function createJsonUserRepository(source: JsonUserSource): UserRepository {
	return {
		readAll: (): readonly User[] =>
			readJsonArray(source.file).map((item, at) => {
				source.validator.assertValid(
					USER_SCHEMA_ID,
					item,
					`${source.file}${ITEM_MARK}${String(at)}`
				);
				return item as User;
			})
	};
}
