import type { BankSlug } from '../domain/bank.ts';
import type { Finding } from '../domain/finding.ts';
import type { CatalogRepositories } from './catalog-repositories.ts';

import { bankRecords } from '../domain/bank.ts';
import { rulesForBank } from '../domain/rules/bank-rules.ts';
import { catalogOf } from './catalog-repositories.ts';

export interface CatalogReport {
	readonly banks: readonly BankReport[];
	readonly failureCount: number;
}

interface BankReport {
	readonly exerciseCount: number;
	readonly findings: readonly Finding[];
	readonly slug: BankSlug;
	readonly title: string;
}

export const validateCatalog = (repositories: CatalogRepositories): CatalogReport => {
	const catalog = catalogOf(repositories);
	const banks = catalog.banks.map((bank) => ({
		exerciseCount: bankRecords(bank).length,
		findings: rulesForBank(bank.slug).flatMap((rule) => rule(bank, catalog)),
		slug: bank.slug,
		title: bank.title
	}));
	return {
		banks,
		failureCount: banks.reduce((total, bank) => total + bank.findings.length, 0)
	};
};
