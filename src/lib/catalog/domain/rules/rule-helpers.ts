import type { BankExercise, ExerciseConstraints } from '../bank.ts';
import type { Catalog } from '../catalog.ts';
import type { Equipment } from '../equipment.ts';

import { mainEquipmentRefsOf } from '../bank.ts';
import { equipmentOf } from '../catalog.ts';

const GLUE_TOKENS = [' и ', '+', '/'];
const COMPOUND_DOSE_TOKEN = '+';
const LATIN_LETTER = /[a-z]/i;
const NON_CYRILLIC = /[^а-яё]/g;
const PER_SIDE_SUFFIX = '/сторона';

export const LIST_SEPARATOR = ', ';

export function hasCompoundDose(dose: string): boolean {
	return dose.includes(COMPOUND_DOSE_TOKEN);
}

export function hasGluedName(name: string): boolean {
	return GLUE_TOKENS.some((token) => name.includes(token));
}

export function hasLatinLetters(name: string): boolean {
	return LATIN_LETTER.test(name);
}

export function hasPerSideSuffix(name: string): boolean {
	return name.endsWith(PER_SIDE_SUFFIX);
}

export function hasSpineFlag(constraints: ExerciseConstraints): boolean {
	return constraints.axial || constraints.lumbar_flex || constraints.lumbar_ext;
}

export function isSameList(actual: readonly string[], expected: readonly string[]): boolean {
	return actual.length === expected.length && actual.every((item, at) => item === expected[at]);
}

export function mainEquipmentOf(catalog: Catalog, exercise: BankExercise): Equipment | undefined {
	const [first] = mainEquipmentRefsOf(exercise);
	return first === undefined ? undefined : equipmentOf(catalog, first.id);
}

export function matchedPatterns(text: string, patterns: readonly string[]): string[] {
	return patterns.filter((pattern) => text.toLowerCase().includes(pattern));
}

export function normalizedName(name: string): string {
	return name.toLowerCase().replaceAll(NON_CYRILLIC, '');
}
