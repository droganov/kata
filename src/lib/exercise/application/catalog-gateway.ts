import type { EquipmentView, TargetView } from '../../catalog/application/catalog-views.ts';

export interface CatalogGateway {
	readEquipment: () => readonly EquipmentView[];
	readTargets: () => readonly TargetView[];
}
