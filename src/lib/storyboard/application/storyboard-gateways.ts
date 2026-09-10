import type { PromptCatalog } from '../domain/prompt.ts';
import type { CatalogGateway } from './catalog-gateway.ts';
import type { ExerciseGateway } from './exercise-gateway.ts';

export interface StoryboardGateways {
	readonly catalog: CatalogGateway;
	readonly exercises: ExerciseGateway;
}

export function promptCatalogOf(gateway: CatalogGateway): PromptCatalog {
	return {
		equipment: new Map(gateway.readEquipment().map((item) => [item.id, item])),
		targets: new Map(gateway.readTargets().map((item) => [item.id, item]))
	};
}
