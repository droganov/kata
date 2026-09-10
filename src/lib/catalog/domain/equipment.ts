import type { Uuid } from '../../shared/uuid.ts';

export const EQUIPMENT_KIND = {
	apparatus: 'apparatus',
	body: 'body',
	environment: 'environment',
	free_weight: 'free_weight',
	machine: 'machine',
	tool: 'tool'
} as const;

export interface Equipment {
	readonly canon_en: string;
	readonly exercises: readonly Uuid[];
	readonly id: Uuid;
	readonly kind: EquipmentKind;
	readonly name: string;
	readonly slug: string;
}

export type EquipmentKind = (typeof EQUIPMENT_KIND)[keyof typeof EQUIPMENT_KIND];
