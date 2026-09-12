import type { Bank, BankExercise, BankSlug } from '../bank.ts';
import type { Catalog } from '../catalog.ts';
import type { Equipment, EquipmentKind } from '../equipment.ts';
import type { Finding } from '../finding.ts';
import type { TargetKind } from '../target.ts';

import { bankRecords, EQUIPMENT_ROLE, mainEquipmentRefsOf, TARGET_ROLE } from '../bank.ts';
import { equipmentOf, targetOf } from '../catalog.ts';
import { EQUIPMENT_KIND } from '../equipment.ts';
import { exerciseSubject, ruleCheck } from '../finding.ts';
import { TARGET_KIND } from '../target.ts';
import { LIST_SEPARATOR } from './rule-helpers.ts';

const RULE_EQUIP = 'L1 EQUIP';
const RULE_ROLE_E = 'L2 ROLE_E';
const RULE_TARGET = 'L3 TARGET';
const RULE_KIND = 'L4 KIND';
const RULE_NAME = 'L5 NAME';
const RULE_SAME = 'L6 SAME';
const RULE_SYM = 'L8 SYM';
const ROLE_SEPARATOR = ':';
const MACHINE_FAMILY_SLUGS = ['band', 'box', 'mini_band', 'stairs_step', 'step_platform'];
const MACHINE_FAMILY_KINDS = [EQUIPMENT_KIND.machine];
const BENCH_PREFIXES = ['bench', 'nordic', 'preacher', 'roman'];
const BAR_SLUGS = ['assisted_dip_chin', 'dip_bars'];

const BANK_TARGET_KIND: Record<BankSlug, TargetKind> = {
	calisthenics: TARGET_KIND.muscle,
	cardio: TARGET_KIND.system,
	strength: TARGET_KIND.muscle,
	stretch: TARGET_KIND.muscle,
	warmup: TARGET_KIND.joint
};

const EQUIPMENT_ROLES: ReadonlySet<string> = new Set([
	EQUIPMENT_ROLE.auxiliary,
	EQUIPMENT_ROLE.main
]);

const TARGET_ROLES: ReadonlySet<string> = new Set([
	TARGET_ROLE.primary,
	TARGET_ROLE.secondary,
	TARGET_ROLE.stabilizer
]);

interface GearRequirement {
	readonly kinds?: readonly EquipmentKind[];
	readonly pattern: RegExp;
	readonly prefixes?: readonly string[];
	readonly slugs?: readonly string[];
	readonly stem: string;
}

const GEAR_REQUIREMENTS: readonly GearRequirement[] = [
	{ pattern: /(?<![а-яё])гантел/, slugs: ['dumbbells'], stem: 'гантел' },
	{ pattern: /(?<![а-яё])скамь/, prefixes: BENCH_PREFIXES, stem: 'скамь' },
	{ pattern: /(?<![а-яё])турник/, slugs: ['pullup_bar'], stem: 'турник' },
	{ pattern: /(?<![а-яё])брусь/, slugs: BAR_SLUGS, stem: 'брусь' },
	{
		kinds: MACHINE_FAMILY_KINDS,
		pattern: /(?<![а-яё])блок/,
		slugs: MACHINE_FAMILY_SLUGS,
		stem: 'блок'
	},
	{
		kinds: MACHINE_FAMILY_KINDS,
		pattern: /(?<![а-яё])тренаж/,
		slugs: MACHINE_FAMILY_SLUGS,
		stem: 'тренаж'
	},
	{ pattern: /(?<![а-яё])полотенц/, slugs: ['towel'], stem: 'полотенц' },
	{ pattern: /(?<![а-яё])ремн/, slugs: ['strap'], stem: 'ремн' },
	{ pattern: /(?<![а-яё])ремен/, slugs: ['strap'], stem: 'ремен' },
	{ pattern: /(?<![а-яё])валик/, slugs: ['foam_roller'], stem: 'валик' },
	{ pattern: /(?<![а-яё])стен/, slugs: ['wall'], stem: 'стен' },
	{ pattern: /(?<![а-яё])проём/, slugs: ['doorframe'], stem: 'проём' },
	{
		kinds: MACHINE_FAMILY_KINDS,
		pattern: /(?<![а-яё])ступень/,
		slugs: MACHINE_FAMILY_SLUGS,
		stem: 'ступень'
	},
	{
		kinds: MACHINE_FAMILY_KINDS,
		pattern: /(?<![а-яё])резин/,
		slugs: MACHINE_FAMILY_SLUGS,
		stem: 'резин'
	},
	{ pattern: /(?<![а-яё])слайдер/, slugs: ['sliders'], stem: 'слайдер' },
	{ pattern: /(?<![а-яё])эспандер/, slugs: ['grip_trainer'], stem: 'эспандер' },
	{ pattern: /(?<![а-яё])блин/, slugs: ['plate'], stem: 'блин' },
	{ pattern: /(?<![а-яё])утяжелит/, slugs: ['ankle_weights'], stem: 'утяжелит' },
	{ pattern: /(?<![а-яё])смит/, slugs: ['smith'], stem: 'смит' },
	{ pattern: /(?<![а-яё])гравитрон/, slugs: ['assisted_dip_chin'], stem: 'гравитрон' },
	{
		kinds: MACHINE_FAMILY_KINDS,
		pattern: /(?<![а-яё])кроссовер/,
		slugs: MACHINE_FAMILY_SLUGS,
		stem: 'кроссовер'
	}
];

export const equipmentBackLinksSymmetric = (bank: Bank, catalog: Catalog): Finding[] => {
	const records = bankRecords(bank);
	const exerciseById = new Map(records.map(({ exercise }) => [exercise.id, exercise]));
	const forward = records.flatMap(({ exercise }) =>
		exercise.equipment.flatMap((reference) => {
			const item = equipmentOf(catalog, reference.id);
			return item === undefined
				? []
				: ruleCheck(
						item.exercises.includes(exercise.id),
						RULE_SYM,
						exerciseSubject(bank, exercise),
						`${exercise.name} → ${item.slug}, средство не знает упражнения`
					);
		})
	);
	const backward = catalog.equipment.flatMap((item) =>
		item.exercises.flatMap((id) => {
			const exercise = exerciseById.get(id);
			return exercise === undefined
				? []
				: ruleCheck(
						exercise.equipment.some((reference) => reference.id === item.id),
						RULE_SYM,
						item.slug,
						`${item.slug} → ${exercise.name}, обратной связи нет`
					);
		})
	);
	return [...forward, ...backward];
};

export const equipmentRefsValid = (bank: Bank, catalog: Catalog): Finding[] =>
	bankRecords(bank).flatMap(({ exercise }) => {
		const references = exercise.equipment;
		const subject = exerciseSubject(bank, exercise);
		const unknown = references.filter(
			(reference) => equipmentOf(catalog, reference.id) === undefined
		);
		const mains = mainEquipmentRefsOf(exercise);
		return [
			...ruleCheck(
				references.length > 0,
				RULE_EQUIP,
				subject,
				`${exercise.name}: нет средств`
			),
			...ruleCheck(
				mains.length === 1,
				RULE_EQUIP,
				subject,
				`${exercise.name}: главных средств ${String(mains.length)}`
			),
			...ruleCheck(
				unknown.length === 0,
				RULE_EQUIP,
				subject,
				`${exercise.name}: неизвестные средства ${unknown.map((reference) => reference.id).join(LIST_SEPARATOR)}`
			),
			...ruleCheck(
				new Set(references.map((reference) => reference.id)).size === references.length,
				RULE_EQUIP,
				subject,
				`${exercise.name}: повтор средства`
			)
		];
	});

export const equipmentRolesValid = (bank: Bank): Finding[] =>
	bankRecords(bank).flatMap(({ exercise }) =>
		exercise.equipment
			.filter((reference) => !EQUIPMENT_ROLES.has(reference.role))
			.map((reference) => ({
				message: `${exercise.name}: роль средства ${reference.role}`,
				rule: RULE_ROLE_E,
				subject: exerciseSubject(bank, exercise)
			}))
	);

export const nameMentionsOwnedGear = (bank: Bank, catalog: Catalog): Finding[] =>
	bankRecords(bank).flatMap(({ exercise }) => {
		const owned = ownedEquipmentOf(catalog, exercise);
		const name = exercise.name.toLowerCase();
		return GEAR_REQUIREMENTS.filter(
			(requirement) => requirement.pattern.test(name) && !hasRequiredGear(requirement, owned)
		).map((requirement) => ({
			message: `${exercise.name}: имя упоминает «${requirement.stem}», в средствах нет: ${owned.map((item) => item.slug).join(LIST_SEPARATOR)}`,
			rule: RULE_NAME,
			subject: exerciseSubject(bank, exercise)
		}));
	});

export const sameNameSameLinks = (bank: Bank): Finding[] => {
	const seen = new Map<string, string>();
	const findings: Finding[] = [];
	for (const { exercise } of bankRecords(bank)) {
		const signature = linkSignature(exercise);
		const twin = seen.get(exercise.name);
		if (twin === undefined) seen.set(exercise.name, signature);
		else if (twin !== signature)
			findings.push({
				message: `${exercise.name}: связи отличаются от одноимённой записи`,
				rule: RULE_SAME,
				subject: exerciseSubject(bank, exercise)
			});
	}
	return findings;
};

export const targetKindMatchesBank = (bank: Bank, catalog: Catalog): Finding[] => {
	const expected = BANK_TARGET_KIND[bank.slug];
	return bankRecords(bank).flatMap(({ exercise }) =>
		exercise.targets.flatMap((reference) => {
			const target = targetOf(catalog, reference.id);
			return target === undefined
				? []
				: ruleCheck(
						target.kind === expected,
						RULE_KIND,
						exerciseSubject(bank, exercise),
						`${exercise.name}: цель ${target.slug} вида ${target.kind} при банке ${bank.slug}`
					);
		})
	);
};

export const targetRefsValid = (bank: Bank, catalog: Catalog): Finding[] =>
	bankRecords(bank).flatMap(({ exercise }) => {
		const references = exercise.targets;
		const subject = exerciseSubject(bank, exercise);
		const unknown = references.filter(
			(reference) => targetOf(catalog, reference.id) === undefined
		);
		const badRoles = references.filter((reference) => !TARGET_ROLES.has(reference.role));
		return [
			...ruleCheck(
				references.length > 0,
				RULE_TARGET,
				subject,
				`${exercise.name}: нет целей`
			),
			...ruleCheck(
				references.some((reference) => reference.role === TARGET_ROLE.primary),
				RULE_TARGET,
				subject,
				`${exercise.name}: нет основной цели`
			),
			...ruleCheck(
				unknown.length === 0,
				RULE_TARGET,
				subject,
				`${exercise.name}: неизвестные цели ${unknown.map((reference) => reference.id).join(LIST_SEPARATOR)}`
			),
			...ruleCheck(
				badRoles.length === 0,
				RULE_TARGET,
				subject,
				`${exercise.name}: роль цели ${badRoles.map((reference) => reference.role).join(LIST_SEPARATOR)}`
			),
			...ruleCheck(
				new Set(references.map((reference) => reference.id)).size === references.length,
				RULE_TARGET,
				subject,
				`${exercise.name}: повтор цели`
			)
		];
	});

const hasRequiredGear = (requirement: GearRequirement, owned: readonly Equipment[]): boolean => {
	const slugs = requirement.slugs ?? [];
	const prefixes = requirement.prefixes ?? [];
	const kinds = requirement.kinds ?? [];
	return owned.some(
		(item) =>
			slugs.includes(item.slug) ||
			prefixes.some((prefix) => item.slug.startsWith(prefix)) ||
			kinds.includes(item.kind)
	);
};

const linkSignature = (exercise: BankExercise): string =>
	[
		...exercise.equipment.map(
			(reference) => `${reference.id}${ROLE_SEPARATOR}${reference.role}`
		),
		...exercise.targets.map((reference) => `${reference.id}${ROLE_SEPARATOR}${reference.role}`)
	]
		.toSorted((first, second) => first.localeCompare(second))
		.join(LIST_SEPARATOR);

const ownedEquipmentOf = (catalog: Catalog, exercise: BankExercise): Equipment[] =>
	exercise.equipment.flatMap((reference) => {
		const item = equipmentOf(catalog, reference.id);
		return item === undefined ? [] : [item];
	});
