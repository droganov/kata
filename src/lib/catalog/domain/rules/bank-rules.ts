import type { Bank, BankSlug } from '../bank.ts';
import type { Catalog } from '../catalog.ts';
import type { Finding } from '../finding.ts';

import { bankInvariants } from '../bank-invariants.ts';
import {
	calisthenicsDoseFormat,
	calisthenicsMainGearKind,
	calisthenicsModeMatchesDose,
	calisthenicsSpineSafety
} from './calisthenics-rules.ts';
import {
	filledContours,
	pickWithinContourBank,
	russianNames,
	singleDosePerRecord,
	singleMovementAllowingPerSide,
	singleMovementPerRecord,
	uniqueRecords,
	zonesMatchStrengthBank
} from './common-rules.ts';
import {
	equipmentBackLinksSymmetric,
	equipmentRefsValid,
	equipmentRolesValid,
	nameMentionsOwnedGear,
	sameNameSameLinks,
	targetKindMatchesBank,
	targetRefsValid
} from './links-rules.ts';
import {
	strengthDoseFormat,
	strengthLoadedMode,
	strengthSpineSafety,
	strengthWeightLimit
} from './strength-rules.ts';
import {
	stretchBodyOnly,
	stretchDoseFormat,
	stretchHowToNote,
	stretchSpineSafety,
	stretchStaticMode
} from './stretch-rules.ts';
import {
	warmupBodyOnly,
	warmupDoseFormat,
	warmupDynamicOnly,
	warmupSessionTime,
	warmupSpineSafety
} from './warmup-rules.ts';

export type BankRule = (bank: Bank, catalog: Catalog) => Finding[];

const BASE_RULES: readonly BankRule[] = [
	bankInvariants,
	equipmentRefsValid,
	equipmentRolesValid,
	targetRefsValid,
	targetKindMatchesBank,
	nameMentionsOwnedGear,
	sameNameSameLinks,
	equipmentBackLinksSymmetric
];

const RECORD_RULES: readonly BankRule[] = [singleMovementPerRecord, uniqueRecords, russianNames];

const RULES_BY_BANK: Record<BankSlug, readonly BankRule[]> = {
	calisthenics: [
		...BASE_RULES,
		singleMovementAllowingPerSide,
		uniqueRecords,
		russianNames,
		filledContours,
		calisthenicsDoseFormat,
		calisthenicsModeMatchesDose,
		calisthenicsSpineSafety,
		calisthenicsMainGearKind,
		zonesMatchStrengthBank
	],
	cardio: BASE_RULES,
	strength: [
		...BASE_RULES,
		...RECORD_RULES,
		filledContours,
		strengthDoseFormat,
		strengthLoadedMode,
		strengthSpineSafety,
		strengthWeightLimit
	],
	stretch: [
		...BASE_RULES,
		...RECORD_RULES,
		filledContours,
		stretchDoseFormat,
		stretchStaticMode,
		stretchSpineSafety,
		stretchBodyOnly,
		stretchHowToNote,
		zonesMatchStrengthBank
	],
	warmup: [
		...BASE_RULES,
		...RECORD_RULES,
		singleDosePerRecord,
		pickWithinContourBank,
		warmupDoseFormat,
		warmupDynamicOnly,
		warmupSpineSafety,
		warmupSessionTime,
		warmupBodyOnly
	]
};

export function rulesForBank(slug: BankSlug): readonly BankRule[] {
	return RULES_BY_BANK[slug];
}
