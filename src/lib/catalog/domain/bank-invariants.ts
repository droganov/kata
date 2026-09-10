import type { Bank } from './bank.ts';
import type { Catalog } from './catalog.ts';
import type { Finding } from './finding.ts';

import { bankRecords, contoursOf, mainEquipmentRefsOf } from './bank.ts';
import { equipmentOf, targetOf } from './catalog.ts';
import { bankSubject, contourSubject, exerciseSubject, ruleCheck } from './finding.ts';
import { LIST_SEPARATOR } from './rules/rule-helpers.ts';

const RULE_ZONE_SLUG = 'I1 ZONE_SLUG';
const RULE_CONTOUR_SLUG = 'I2 CONTOUR_SLUG';
const RULE_CONTOUR_FILLED = 'I3 CONTOUR_FILLED';
const RULE_MAIN_EQUIPMENT = 'I4 MAIN_EQUIPMENT';
const RULE_REFERENCES = 'I5 REFERENCES';

export function bankInvariants(bank: Bank, catalog: Catalog): Finding[] {
	const emptyContours = contoursOf(bank)
		.filter(({ contour }) => contour.exercises.length === 0)
		.map(({ contour, zone }) => ({
			message: `${zone.title} / ${contour.title}: контур пуст`,
			rule: RULE_CONTOUR_FILLED,
			subject: contourSubject(bank, zone, contour)
		}));
	return [...slugInvariants(bank), ...emptyContours, ...referenceInvariants(bank, catalog)];
}

function referenceInvariants(bank: Bank, catalog: Catalog): Finding[] {
	return bankRecords(bank).flatMap(({ exercise }) => {
		const subject = exerciseSubject(bank, exercise);
		const mains = mainEquipmentRefsOf(exercise);
		const lostEquipment = exercise.equipment.filter(
			(reference) => equipmentOf(catalog, reference.id) === undefined
		);
		const lostTargets = exercise.targets.filter(
			(reference) => targetOf(catalog, reference.id) === undefined
		);
		return [
			...ruleCheck(
				mains.length === 1,
				RULE_MAIN_EQUIPMENT,
				subject,
				`${exercise.name}: средств с ролью main ${String(mains.length)}`
			),
			...ruleCheck(
				lostEquipment.length === 0 && lostTargets.length === 0,
				RULE_REFERENCES,
				subject,
				`${exercise.name}: висячие ссылки ${[...lostEquipment, ...lostTargets].map((reference) => reference.id).join(LIST_SEPARATOR)}`
			)
		];
	});
}

function repeatedValues(values: readonly string[]): string[] {
	const seen = new Set<string>();
	const repeated = new Set<string>();
	for (const value of values) {
		if (seen.has(value)) repeated.add(value);
		else seen.add(value);
	}
	return [...repeated];
}

function slugInvariants(bank: Bank): Finding[] {
	const zoneSlugs = repeatedValues(bank.zones.map((zone) => zone.slug));
	const contourSlugs = repeatedValues(contoursOf(bank).map(({ contour }) => contour.slug));
	return [
		...ruleCheck(
			zoneSlugs.length === 0,
			RULE_ZONE_SLUG,
			bankSubject(bank),
			`повтор slug зоны: ${zoneSlugs.join(LIST_SEPARATOR)}`
		),
		...ruleCheck(
			contourSlugs.length === 0,
			RULE_CONTOUR_SLUG,
			bankSubject(bank),
			`повтор slug контура: ${contourSlugs.join(LIST_SEPARATOR)}`
		)
	];
}
