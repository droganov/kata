import type { Uuid } from '../../shared/uuid.ts';
import type { Bank, BankSlug } from './bank.ts';
import type { Equipment } from './equipment.ts';
import type { Target } from './target.ts';

export interface Catalog {
	readonly banks: readonly Bank[];
	readonly equipment: readonly Equipment[];
	readonly targets: readonly Target[];
}

export function bankOf(catalog: Catalog, slug: BankSlug): Bank | undefined {
	return catalog.banks.find((bank) => bank.slug === slug);
}

export function equipmentOf(catalog: Catalog, id: Uuid): Equipment | undefined {
	return catalog.equipment.find((item) => item.id === id);
}

export function targetOf(catalog: Catalog, id: Uuid): Target | undefined {
	return catalog.targets.find((target) => target.id === id);
}
