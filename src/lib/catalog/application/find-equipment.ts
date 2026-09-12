import type { EquipmentView } from './catalog-views.ts';
import type { EquipmentRepository } from './equipment-repository.ts';

import { equipmentViewOf } from './catalog-views.ts';

export const findEquipment = (
	repository: EquipmentRepository,
	ids?: readonly string[]
): EquipmentView[] => {
	const items = repository.readAll();
	const wanted = ids === undefined ? items : items.filter((item) => ids.includes(item.id));
	return wanted.map((item) => equipmentViewOf(item));
};
