import type { Bank, BankExercise, BankRecord } from '../bank.ts';
import type { Catalog } from '../catalog.ts';
import type { Finding } from '../finding.ts';

import { BANK_SLUG, bankRecords, contoursOf } from '../bank.ts';
import { bankOf } from '../catalog.ts';
import { bankSubject, contourSubject, exerciseSubject, ruleCheck } from '../finding.ts';
import {
	hasCompoundDose,
	hasGluedName,
	hasLatinLetters,
	hasPerSideSuffix,
	isSameList,
	LIST_SEPARATOR,
	normalizedName
} from './rule-helpers.ts';

const RULE_SRP = 'R1 SRP';
const RULE_UNIQUE = 'R2 UNIQUE';
const RULE_COVERAGE = 'R3 COVERAGE';
const RULE_NAMES = 'R4 NAMES';
const RULE_ZONES = 'R9 ZONES';
const LABEL_ID = 'id';
const LABEL_NAME = 'имя';
const MIN_PICK = 1;

export function filledContours(bank: Bank): Finding[] {
	return contoursOf(bank)
		.filter(({ contour }) => contour.exercises.length === 0)
		.map(({ contour, zone }) => ({
			message: `${zone.title} / ${contour.title}: банк пуст`,
			rule: RULE_COVERAGE,
			subject: contourSubject(bank, zone, contour)
		}));
}

export function pickWithinContourBank(bank: Bank): Finding[] {
	return contoursOf(bank).flatMap(({ contour, zone }) => {
		const pick = contour.pick ?? 0;
		return ruleCheck(
			pick >= MIN_PICK && contour.exercises.length >= pick,
			RULE_COVERAGE,
			contourSubject(bank, zone, contour),
			`${zone.title} / ${contour.title}: pick ${String(pick)}, банк ${String(contour.exercises.length)}`
		);
	});
}

export function russianNames(bank: Bank): Finding[] {
	return bankRecords(bank)
		.filter(({ exercise }) => hasLatinLetters(exercise.name))
		.map(({ exercise }) => ({
			message: `${exercise.name}: латиница`,
			rule: RULE_NAMES,
			subject: exerciseSubject(bank, exercise)
		}));
}

export function singleDosePerRecord(bank: Bank): Finding[] {
	return bankRecords(bank)
		.filter(({ exercise }) => hasCompoundDose(exercise.dose))
		.map(({ exercise }) => ({
			message: `${exercise.name}: составная доза ${exercise.dose}`,
			rule: RULE_SRP,
			subject: exerciseSubject(bank, exercise)
		}));
}

export function singleMovementAllowingPerSide(bank: Bank): Finding[] {
	return bankRecords(bank)
		.filter(({ exercise }) => hasGluedName(exercise.name) && !hasPerSideSuffix(exercise.name))
		.map(({ exercise }) => ({
			message: `${exercise.name}: склейка в имени`,
			rule: RULE_SRP,
			subject: exerciseSubject(bank, exercise)
		}));
}

export function singleMovementPerRecord(bank: Bank): Finding[] {
	return bankRecords(bank)
		.filter(({ exercise }) => hasGluedName(exercise.name))
		.map(({ exercise }) => ({
			message: `${exercise.name}: склейка в имени`,
			rule: RULE_SRP,
			subject: exerciseSubject(bank, exercise)
		}));
}

export function uniqueRecords(bank: Bank): Finding[] {
	const records = bankRecords(bank);
	return [
		...duplicateFindings(bank, records, (exercise) => exercise.id, LABEL_ID),
		...duplicateFindings(bank, records, (exercise) => normalizedName(exercise.name), LABEL_NAME)
	];
}

export function zonesMatchStrengthBank(bank: Bank, catalog: Catalog): Finding[] {
	const reference = bankOf(catalog, BANK_SLUG.strength)?.zones ?? [];
	const slugs = bank.zones.map((zone) => zone.slug);
	const referenceSlugs = reference.map((zone) => zone.slug);
	const titles = bank.zones.map((zone) => zone.title);
	const referenceTitles = reference.map((zone) => zone.title);
	return [
		...ruleCheck(
			isSameList(slugs, referenceSlugs),
			RULE_ZONES,
			bankSubject(bank),
			`зоны ${slugs.join(LIST_SEPARATOR)} ≠ силовой ${referenceSlugs.join(LIST_SEPARATOR)}`
		),
		...ruleCheck(
			isSameList(titles, referenceTitles),
			RULE_ZONES,
			bankSubject(bank),
			`названия зон ${titles.join(LIST_SEPARATOR)} ≠ силовой ${referenceTitles.join(LIST_SEPARATOR)}`
		)
	];
}

function duplicateFindings(
	bank: Bank,
	records: readonly BankRecord[],
	keyOf: (exercise: BankExercise) => string,
	label: string
): Finding[] {
	const seen = new Map<string, string>();
	const findings: Finding[] = [];
	for (const { exercise } of records) {
		const key = keyOf(exercise);
		const twin = seen.get(key);
		if (twin === undefined) seen.set(key, exercise.name);
		else
			findings.push({
				message: `${label} ${key}: «${exercise.name}» дубль «${twin}»`,
				rule: RULE_UNIQUE,
				subject: exerciseSubject(bank, exercise)
			});
	}
	return findings;
}
