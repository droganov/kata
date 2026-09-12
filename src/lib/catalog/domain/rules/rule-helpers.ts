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

export const hasCompoundDose = (dose: string): boolean => dose.includes(COMPOUND_DOSE_TOKEN);

export const hasGluedName = (name: string): boolean =>
	GLUE_TOKENS.some((token) => name.includes(token));

export const hasLatinLetters = (name: string): boolean => LATIN_LETTER.test(name);

export const hasPerSideSuffix = (name: string): boolean => name.endsWith(PER_SIDE_SUFFIX);

export const hasSpineFlag = (constraints: ExerciseConstraints): boolean =>
	constraints.axial || constraints.lumbar_flex || constraints.lumbar_ext;

export const isSameList = (actual: readonly string[], expected: readonly string[]): boolean =>
	actual.length === expected.length && actual.every((item, at) => item === expected[at]);

export const mainEquipmentOf = (
	catalog: Catalog,
	exercise: BankExercise
): Equipment | undefined => {
	const [first] = mainEquipmentRefsOf(exercise);
	return first === undefined ? undefined : equipmentOf(catalog, first.id);
};

export const matchedPatterns = (text: string, patterns: readonly string[]): string[] =>
	patterns.filter((pattern) => text.toLowerCase().includes(pattern));

export const normalizedName = (name: string): string =>
	name.toLowerCase().replaceAll(NON_CYRILLIC, '');
