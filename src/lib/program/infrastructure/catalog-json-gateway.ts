import { readdirSync } from 'node:fs';
import path from 'node:path';

import type { BankRepository } from '../../catalog/application/bank-repository.ts';
import type { TargetRepository } from '../../catalog/application/target-repository.ts';
import type { CatalogGateway } from '../application/catalog-gateway.ts';
import type { SchemaValidator } from './json-schema-validator.ts';

import { findTargets } from '../../catalog/application/find-targets.ts';
import { listBanks } from '../../catalog/application/list-banks.ts';
import { readJsonArray, readJsonFile } from './json-file.ts';

const BANK_SCHEMA_ID = 'bank.schema.json';
const TARGET_SCHEMA_ID = 'target.schema.json';
const JSON_SUFFIX = '.json';
const ITEM_MARK = '#';

export interface CatalogJsonSource {
	readonly banksDirectory: string;
	readonly targetsFile: string;
	readonly validator: SchemaValidator;
}

type CatalogBank = ReturnType<BankRepository['readAll']>[number];

type CatalogTarget = ReturnType<TargetRepository['readAll']>[number];

export function createCatalogJsonGateway(source: CatalogJsonSource): CatalogGateway {
	return {
		readBanks: () =>
			listBanks({
				readAll: (): readonly CatalogBank[] =>
					readdirSync(source.banksDirectory)
						.filter((name) => name.endsWith(JSON_SUFFIX))
						.toSorted((first, second) => first.localeCompare(second))
						.map((name) => {
							const parsed = readJsonFile(path.join(source.banksDirectory, name));
							source.validator.assertValid(BANK_SCHEMA_ID, parsed, name);
							return parsed as CatalogBank;
						})
			}),
		readTargets: () =>
			findTargets({
				readAll: (): readonly CatalogTarget[] =>
					readJsonArray(source.targetsFile).map((item, at) => {
						source.validator.assertValid(
							TARGET_SCHEMA_ID,
							item,
							`${source.targetsFile}${ITEM_MARK}${String(at)}`
						);
						return item as CatalogTarget;
					})
			})
	};
}
