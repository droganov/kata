import type { Bank, BankSlug } from '../domain/bank.ts';
import type { Equipment, EquipmentKind } from '../domain/equipment.ts';
import type { Target, TargetGroup, TargetKind } from '../domain/target.ts';

export interface BankView {
	readonly slug: BankSlug;
	readonly title: string;
	readonly zones: readonly BankZoneView[];
}

export interface EquipmentView {
	readonly canonEn: string;
	readonly id: string;
	readonly kind: EquipmentKind;
	readonly name: string;
	readonly slug: string;
}

export interface TargetView {
	readonly group?: TargetGroup;
	readonly id: string;
	readonly kind: TargetKind;
	readonly latin: string;
	readonly name: string;
	readonly slug: string;
	readonly zone: string;
}

interface BankContourView {
	readonly exerciseIds: readonly string[];
	readonly id: string;
	readonly pick?: number;
	readonly slug: string;
	readonly title: string;
}

interface BankZoneView {
	readonly contours: readonly BankContourView[];
	readonly id: string;
	readonly slug: string;
	readonly title: string;
}

export function bankViewOf(bank: Bank): BankView {
	return {
		slug: bank.slug,
		title: bank.title,
		zones: bank.zones.map((zone) => ({
			contours: zone.contours.map((contour) => ({
				exerciseIds: contour.exercises.map((exercise) => exercise.id),
				id: contour.id,
				...(contour.pick !== undefined && { pick: contour.pick }),
				slug: contour.slug,
				title: contour.title
			})),
			id: zone.id,
			slug: zone.slug,
			title: zone.title
		}))
	};
}

export function equipmentViewOf(equipment: Equipment): EquipmentView {
	return {
		canonEn: equipment.canon_en,
		id: equipment.id,
		kind: equipment.kind,
		name: equipment.name,
		slug: equipment.slug
	};
}

export function targetViewOf(target: Target): TargetView {
	return {
		...(target.group !== undefined && { group: target.group }),
		id: target.id,
		kind: target.kind,
		latin: target.latin,
		name: target.name,
		slug: target.slug,
		zone: target.zone
	};
}
