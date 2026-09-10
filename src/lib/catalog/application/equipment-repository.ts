import type { Equipment } from '../domain/equipment.ts';

export interface EquipmentRepository {
	readAll: () => readonly Equipment[];
}
