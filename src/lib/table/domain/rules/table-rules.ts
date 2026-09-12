import type { Finding } from '../finding.ts';
import type { SourceCatalog } from '../source-catalog.ts';
import type { TableSet } from '../table-file.ts';

import {
	systemTargetsOutsideGroups,
	tablesMatchConversion,
	tablesRestoreSources
} from './carry-rules.ts';
import {
	equipmentLinkedOnce,
	everyExerciseCarried,
	everyExerciseHasSource,
	everyOracleCarried,
	everyVerdictCarried,
	exerciseKnowsNoPlace,
	modalityReplacesCatalog,
	oneMainEquipmentPerExercise,
	oneRowPerCatalogTarget,
	stepTargetsWithinExercise,
	targetKindsDeclared,
	tenMuscleGroups
} from './catalog-rules.ts';
import {
	fileNamesMatchTables,
	keysMatchColumns,
	linesAreTuples,
	primaryKeysIdentifyRows,
	valuesAreScalar
} from './format-rules.ts';
import { foreignKeysResolve, uniqueKeysHold } from './integrity-rules.ts';

export type TableRule = (set: TableSet, catalog: SourceCatalog) => Finding[];

export const FORMAT_RULES: readonly TableRule[] = [
	fileNamesMatchTables,
	linesAreTuples,
	keysMatchColumns,
	valuesAreScalar,
	primaryKeysIdentifyRows
];

export const INTEGRITY_RULES: readonly TableRule[] = [foreignKeysResolve, uniqueKeysHold];

export const CATALOG_RULES: readonly TableRule[] = [
	tenMuscleGroups,
	targetKindsDeclared,
	modalityReplacesCatalog,
	oneRowPerCatalogTarget,
	everyExerciseCarried,
	exerciseKnowsNoPlace,
	equipmentLinkedOnce,
	oneMainEquipmentPerExercise,
	everyExerciseHasSource,
	stepTargetsWithinExercise,
	everyOracleCarried,
	everyVerdictCarried
];

export const CARRY_RULES: readonly TableRule[] = [
	systemTargetsOutsideGroups,
	tablesRestoreSources,
	tablesMatchConversion
];

export const tableRules = (): readonly TableRule[] => [
	...FORMAT_RULES,
	...INTEGRITY_RULES,
	...CATALOG_RULES,
	...CARRY_RULES
];
