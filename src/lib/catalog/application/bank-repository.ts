import type { Bank } from '../domain/bank.ts';

export interface BankRepository {
	readAll: () => readonly Bank[];
}
