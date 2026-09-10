import type { BankRepository } from './bank-repository.ts';
import type { BankView } from './catalog-views.ts';

import { bankViewOf } from './catalog-views.ts';

export function listBanks(repository: BankRepository): BankView[] {
	return repository.readAll().map((bank) => bankViewOf(bank));
}
