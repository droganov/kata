import type { BankRepository } from './bank-repository.ts';
import type { BankView } from './catalog-views.ts';

import { bankViewOf } from './catalog-views.ts';

export const listBanks = (repository: BankRepository): BankView[] =>
	repository.readAll().map((bank) => bankViewOf(bank));
