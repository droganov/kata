import type { Uuid } from '../../shared/uuid.ts';
import type { Bank, BankSlug } from './bank.ts';
import type { Equipment } from './equipment.ts';
import type { Target } from './target.ts';

export interface Catalog {
	readonly banks: readonly Bank[];
	readonly equipment: readonly Equipment[];
	readonly targets: readonly Target[];
}

export const bankOf = (catalog: Catalog, slug: BankSlug): Bank | undefined =>
	catalog.banks.find((bank) => bank.slug === slug);

export const equipmentOf = (catalog: Catalog, id: Uuid): Equipment | undefined =>
	catalog.equipment.find((item) => item.id === id);

export const targetOf = (catalog: Catalog, id: Uuid): Target | undefined =>
	catalog.targets.find((target) => target.id === id);
