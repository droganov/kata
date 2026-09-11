import type { Finding } from '../finding.ts';
import type { SourceCatalog } from '../source-catalog.ts';
import type { TableSet } from '../table-file.ts';

import {
	equipmentLinkedOnce,
	everyExerciseCarried,
	everyExerciseHasSource,
	exerciseKnowsNoPlace,
	modalityReplacesCatalog,
	oneMainEquipmentPerExercise,
	oneRowPerCatalogTarget,
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
	everyExerciseHasSource
];

export function tableRules(): readonly TableRule[] {
	return [...FORMAT_RULES, ...INTEGRITY_RULES, ...CATALOG_RULES];
}
