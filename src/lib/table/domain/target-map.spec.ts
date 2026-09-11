import { describe, expect, it } from 'vitest';

import {
	CATALOG_TARGETS,
	DICTIONARY_TARGET_KIND,
	JOINT_MUSCLE_GROUP,
	TARGET_KIND
} from './target-map.ts';

const MUSCLE_GROUPS = [
	'arms',
	'back',
	'calves',
	'chest',
	'core',
	'glutes',
	'neck',
	'shoulders',
	'thighs',
	'traps'
];
const WARMUP_JOINT_COUNT = 11;

describe('приписка суставов к группам мышц', () => {
	it('каждый сустав приписан к одной из десяти групп', () => {
		for (const group of Object.values(JOINT_MUSCLE_GROUP))
			expect(MUSCLE_GROUPS).toContain(group);
	});
});

describe('мишени каталога', () => {
	it('у каждой объявлен вид из перечня', () => {
		const kinds: readonly string[] = Object.values(TARGET_KIND);
		for (const entry of Object.values(CATALOG_TARGETS)) expect(kinds).toContain(entry.kind);
	});

	it('одиннадцать суставов, и все они ведут в приписанный сустав словаря', () => {
		const joints = Object.values(CATALOG_TARGETS).filter(
			(entry) => entry.kind === TARGET_KIND.joint
		);
		expect(joints).toHaveLength(WARMUP_JOINT_COUNT);
		for (const entry of joints)
			expect(Object.keys(JOINT_MUSCLE_GROUP)).toContain(String(entry.alias));
	});
});

describe('DICTIONARY_TARGET_KIND', () => {
	it('уточняет вид для каждой склеенной записи словаря', () => {
		const aliases = Object.values(CATALOG_TARGETS).filter((entry) => entry.alias !== undefined);
		expect(DICTIONARY_TARGET_KIND.size).toBe(aliases.length);
		expect(DICTIONARY_TARGET_KIND.get('latissimus_dorsi')).toBe(TARGET_KIND.muscle);
		expect(DICTIONARY_TARGET_KIND.get('trapezius_upper')).toBe(TARGET_KIND.muscle_head);
	});
});
