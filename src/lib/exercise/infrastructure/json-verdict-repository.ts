import type { VerdictRepository } from '../application/verdict-repository.ts';
import type { Verdict } from '../domain/verdict.ts';
import type { SchemaValidator } from './json-schema-validator.ts';

import { readJsonArray, writeJsonFile } from './json-file.ts';

const VERDICT_SCHEMA_ID = 'verdict.schema.json';
const ITEM_MARK = '#';

export interface JsonVerdictSource {
	readonly file: string;
	readonly validator: SchemaValidator;
}

export function createJsonVerdictRepository(source: JsonVerdictSource): VerdictRepository {
	return {
		readAll: (): readonly Verdict[] =>
			readJsonArray(source.file).map((item, at) => {
				source.validator.assertValid(
					VERDICT_SCHEMA_ID,
					item,
					`${source.file}${ITEM_MARK}${String(at)}`
				);
				return item as Verdict;
			}),
		save: (verdicts: readonly Verdict[]): void => {
			for (const [at, verdict] of verdicts.entries())
				source.validator.assertValid(
					VERDICT_SCHEMA_ID,
					verdict,
					`${source.file}${ITEM_MARK}${String(at)}`
				);
			writeJsonFile(source.file, verdicts);
		}
	};
}
