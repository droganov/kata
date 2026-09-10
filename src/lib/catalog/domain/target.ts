import type { Uuid } from '../../shared/uuid.ts';

export const TARGET_KIND = { joint: 'joint', muscle: 'muscle', system: 'system' } as const;

export interface Target {
	readonly group?: TargetGroup;
	readonly id: Uuid;
	readonly kind: TargetKind;
	readonly latin: string;
	readonly name: string;
	readonly slug: string;
	readonly zone: string;
}

export type TargetGroup =
	| 'adductors'
	| 'back'
	| 'biceps'
	| 'calves'
	| 'chest'
	| 'core'
	| 'delts'
	| 'feet'
	| 'forearms'
	| 'glutes'
	| 'hamstrings'
	| 'hip_flexors'
	| 'neck'
	| 'quads'
	| 'rear_delt'
	| 'rotators'
	| 'tibialis'
	| 'traps'
	| 'triceps';

export type TargetKind = (typeof TARGET_KIND)[keyof typeof TARGET_KIND];
