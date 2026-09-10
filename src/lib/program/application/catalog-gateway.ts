import type { BankView, TargetView } from '../../catalog/application/catalog-views.ts';

export interface CatalogGateway {
	readBanks: () => readonly BankView[];
	readTargets: () => readonly TargetView[];
}
