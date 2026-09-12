import type { Catalog } from '../domain/catalog.ts';
import type { BankRepository } from './bank-repository.ts';
import type { EquipmentRepository } from './equipment-repository.ts';
import type { TargetRepository } from './target-repository.ts';

export interface CatalogRepositories {
	readonly banks: BankRepository;
	readonly equipment: EquipmentRepository;
	readonly targets: TargetRepository;
}

export const catalogOf = (repositories: CatalogRepositories): Catalog => ({
	banks: repositories.banks.readAll(),
	equipment: repositories.equipment.readAll(),
	targets: repositories.targets.readAll()
});
