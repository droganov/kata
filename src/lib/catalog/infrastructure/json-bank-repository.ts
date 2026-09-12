import { readdirSync } from 'node:fs';
import path from 'node:path';

import type { BankRepository } from '../application/bank-repository.ts';
import type { Bank } from '../domain/bank.ts';
import type { SchemaValidator } from './json-schema-validator.ts';

import { readJsonFile } from './json-file.ts';

const BANK_SCHEMA_ID = 'bank.schema.json';
const JSON_SUFFIX = '.json';

export interface JsonBankSource {
	readonly directory: string;
	readonly validator: SchemaValidator;
}

const assertBank: (
	validator: SchemaValidator,
	value: unknown,
	subject: string
) => asserts value is Bank = (validator, value, subject) => {
	validator.assertValid(BANK_SCHEMA_ID, value, subject);
};

export const createJsonBankRepository = (source: JsonBankSource): BankRepository => ({
	readAll: (): readonly Bank[] =>
		readdirSync(source.directory)
			.filter((name) => name.endsWith(JSON_SUFFIX))
			.toSorted((first, second) => first.localeCompare(second))
			.map((name) => {
				const parsed = readJsonFile(path.join(source.directory, name));
				assertBank(source.validator, parsed, name);
				return parsed;
			})
});
