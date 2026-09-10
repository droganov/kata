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

export function createJsonBankRepository(source: JsonBankSource): BankRepository {
	return {
		readAll: (): readonly Bank[] =>
			readdirSync(source.directory)
				.filter((name) => name.endsWith(JSON_SUFFIX))
				.toSorted((first, second) => first.localeCompare(second))
				.map((name) => {
					const parsed = readJsonFile(path.join(source.directory, name));
					source.validator.assertValid(BANK_SCHEMA_ID, parsed, name);
					return parsed as Bank;
				})
	};
}
