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

const assertUser: (
	validator: SchemaValidator,
	value: unknown,
	subject: string
) => asserts value is User = (validator, value, subject) => {
	validator.assertValid(USER_SCHEMA_ID, value, subject);
};

export const createJsonUserRepository = (source: JsonUserSource): UserRepository => ({
	readAll: (): readonly User[] =>
		readJsonArray(source.file).map((item, at) => {
			assertUser(source.validator, item, `${source.file}${ITEM_MARK}${String(at)}`);
			return item;
		})
});
