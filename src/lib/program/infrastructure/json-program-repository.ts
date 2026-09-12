import type { ProgramRepository } from '../application/program-repository.ts';
import type { Program } from '../domain/program.ts';
import type { SchemaValidator } from './json-schema-validator.ts';

import { readJsonArray } from './json-file.ts';

const PROGRAM_SCHEMA_ID = 'program.schema.json';
const ITEM_MARK = '#';

export interface JsonProgramSource {
	readonly file: string;
	readonly validator: SchemaValidator;
}

const assertProgram: (
	validator: SchemaValidator,
	value: unknown,
	subject: string
) => asserts value is Program = (validator, value, subject) => {
	validator.assertValid(PROGRAM_SCHEMA_ID, value, subject);
};

export const createJsonProgramRepository = (source: JsonProgramSource): ProgramRepository => ({
	readAll: (): readonly Program[] =>
		readJsonArray(source.file).map((item, at) => {
			assertProgram(source.validator, item, `${source.file}${ITEM_MARK}${String(at)}`);
			return item;
		})
});
