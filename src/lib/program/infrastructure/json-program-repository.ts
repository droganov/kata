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

export function createJsonProgramRepository(source: JsonProgramSource): ProgramRepository {
	return {
		readAll: (): readonly Program[] =>
			readJsonArray(source.file).map((item, at) => {
				source.validator.assertValid(
					PROGRAM_SCHEMA_ID,
					item,
					`${source.file}${ITEM_MARK}${String(at)}`
				);
				return item as Program;
			})
	};
}
