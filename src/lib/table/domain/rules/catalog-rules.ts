import type { Finding } from '../finding.ts';
import type { SourceCatalog, SourceOracle } from '../source-catalog.ts';
import type { TableSet } from '../table-file.ts';

import { lineSubject, LIST_SEPARATOR, ruleCheck, slugSubject } from '../finding.ts';
import { sourceOracles, sourcePlacements, sourceRecords } from '../source-catalog.ts';
import { rowsOf, textAt } from '../table-file.ts';
import { keyOf, TABLE_NAME } from '../table.ts';
import { TARGET_KIND, WARMUP_FILE } from '../target-map.ts';
import { RULE } from './rule-codes.ts';

const MUSCLE_GROUP_COUNT = 10;
const WARMUP_JOINT_COUNT = 11;
const LATS_SLUG = 'lats';
const LATS_ALIAS = 'latissimus_dorsi';
const PLACE_COLUMNS = ['axis', 'origin', 'slot'];
const BACK_LINK_COLUMN = 'exercises';
const MAIN_ROLE = 'main';
const COLUMN_CATALOG_TARGET = 'catalog_target_id';
const COLUMN_EQUIPMENT = 'equipment_id';
const COLUMN_EXERCISE = 'exercise_id';
const COLUMN_ID = 'id';
const COLUMN_KIND = 'kind';
const COLUMN_MODALITY = 'modality';
const COLUMN_ROLE = 'role';
const COLUMN_SLUG = 'slug';
const COLUMN_LINE = 'line_id';
const COLUMN_STEP = 'step_id';
const COLUMN_TARGET = 'target_id';
const COLUMN_ORACLE = 'oracle_id';
const COLUMN_SIDE = 'side';
const COLUMN_TEXT = 'text';
const COUNTER_SIDE = 'counter';
const MODEL_SIDE = 'model';
const PAIR_COLUMNS = [COLUMN_EXERCISE, COLUMN_TARGET];
const LINE_COLUMNS = [COLUMN_ORACLE, COLUMN_SIDE, COLUMN_TEXT];
const VERDICT_LINE_COLUMNS = [COLUMN_ORACLE, COLUMN_TEXT];
const KINDS: ReadonlySet<string> = new Set(Object.values(TARGET_KIND));
const MODALITIES: ReadonlySet<string> = new Set([
	'calisthenic',
	'cardio',
	'dynamic',
	'isometric',
	'loaded',
	'static_stretch'
]);

export function equipmentLinkedOnce(set: TableSet): Finding[] {
	const backLinks = rowsOf(set, TABLE_NAME.equipment).filter((row) =>
		Object.hasOwn(row, BACK_LINK_COLUMN)
	);
	const pairs = new Set<string>();
	const twoWay: Finding[] = [];
	for (const [at, row] of rowsOf(set, TABLE_NAME.exercise_equipment).entries()) {
		const pair = `${textAt(row, COLUMN_EXERCISE)}${LIST_SEPARATOR}${textAt(row, COLUMN_EQUIPMENT)}`;
		if (pairs.has(pair))
			twoWay.push({
				message: `связь записана дважды: ${pair}`,
				rule: RULE.gear,
				subject: lineSubject(TABLE_NAME.exercise_equipment, at)
			});
		pairs.add(pair);
	}
	return [
		...ruleCheck(
			backLinks.length === 0,
			RULE.gear,
			TABLE_NAME.equipment,
			`оборудование помнит упражнения: столбец ${BACK_LINK_COLUMN} в ${String(backLinks.length)} строках`
		),
		...twoWay
	];
}

export function everyExerciseCarried(set: TableSet, catalog: SourceCatalog): Finding[] {
	const carried = new Set(rowsOf(set, TABLE_NAME.exercise).map((row) => textAt(row, COLUMN_ID)));
	const records = sourceRecords(catalog);
	const lost = records.filter(({ exercise }) => !carried.has(exercise.id));
	return [
		...ruleCheck(
			lost.length === 0,
			RULE.carried,
			TABLE_NAME.exercise,
			`не перенесены: ${lost.map(({ exercise }) => exercise.slug).join(LIST_SEPARATOR)}`
		),
		...ruleCheck(
			carried.size === records.length,
			RULE.carried,
			TABLE_NAME.exercise,
			`строк ${String(carried.size)}, упражнений в каталогах ${String(records.length)}`
		)
	];
}

export function everyExerciseHasSource(set: TableSet): Finding[] {
	const sourced = new Set(
		rowsOf(set, TABLE_NAME.exercise_source).map((row) => textAt(row, COLUMN_EXERCISE))
	);
	return rowsOf(set, TABLE_NAME.exercise).flatMap((row) =>
		ruleCheck(
			sourced.has(textAt(row, COLUMN_ID)),
			RULE.referenceSource,
			slugSubject(TABLE_NAME.exercise, textAt(row, COLUMN_SLUG)),
			`нет источника`
		)
	);
}

export function everyOracleCarried(set: TableSet, catalog: SourceCatalog): Finding[] {
	const oracles = sourceOracles(catalog);
	const carried = new Set(rowsOf(set, TABLE_NAME.oracle).map((row) => textAt(row, COLUMN_ID)));
	const lost = oracles.filter((oracle) => !carried.has(oracle.id));
	const written = new Set(
		rowsOf(set, TABLE_NAME.oracle_line).map((row) => keyOf(row, LINE_COLUMNS))
	);
	const lostLines = sourceLineKeys(oracles).filter((key) => !written.has(key));
	return [
		...ruleCheck(
			lost.length === 0,
			RULE.oracleCarried,
			TABLE_NAME.oracle,
			`не перенесены оракулы: ${lost.map((oracle) => oracle.id).join(LIST_SEPARATOR)}`
		),
		...ruleCheck(
			lostLines.length === 0,
			RULE.oracleCarried,
			TABLE_NAME.oracle_line,
			`не перенесены строки наблюдений: ${String(lostLines.length)}`
		)
	];
}

export function everyVerdictCarried(set: TableSet, catalog: SourceCatalog): Finding[] {
	const counters = new Map(
		sourceOracles(catalog).map((oracle) => [oracle.id, new Set(oracle.counterModel)])
	);
	const keyByLine = new Map(
		rowsOf(set, TABLE_NAME.oracle_line)
			.filter((row) => textAt(row, COLUMN_SIDE) === COUNTER_SIDE)
			.map((row) => [textAt(row, COLUMN_ID), keyOf(row, VERDICT_LINE_COLUMNS)])
	);
	const carried = new Set(
		rowsOf(set, TABLE_NAME.verdict).flatMap((row) => {
			const key = keyByLine.get(textAt(row, COLUMN_LINE));
			return key === undefined ? [] : [key];
		})
	);
	const lost = catalog.verdicts.filter(
		(verdict) =>
			counters.get(verdict.oracle)?.has(verdict.line) === true &&
			!carried.has(verdictLineKey(verdict.oracle, verdict.line))
	);
	return ruleCheck(
		lost.length === 0,
		RULE.verdictCarried,
		TABLE_NAME.verdict,
		`не перенесены вердикты: ${lost.map((verdict) => verdict.line).join(LIST_SEPARATOR)}`
	);
}

export function exerciseKnowsNoPlace(set: TableSet): Finding[] {
	return rowsOf(set, TABLE_NAME.exercise).flatMap((row, at) => {
		const present = PLACE_COLUMNS.filter((column) => Object.hasOwn(row, column));
		return ruleCheck(
			present.length === 0,
			RULE.leaf,
			lineSubject(TABLE_NAME.exercise, at),
			`упражнение знает своё место: ${present.join(LIST_SEPARATOR)}`
		);
	});
}

export function modalityReplacesCatalog(set: TableSet): Finding[] {
	return rowsOf(set, TABLE_NAME.exercise).flatMap((row) =>
		ruleCheck(
			MODALITIES.has(textAt(row, COLUMN_MODALITY)),
			RULE.modality,
			slugSubject(TABLE_NAME.exercise, textAt(row, COLUMN_SLUG)),
			`режим вне перечня: ${textAt(row, COLUMN_MODALITY)}`
		)
	);
}

export function oneMainEquipmentPerExercise(set: TableSet): Finding[] {
	const mains = new Map<string, number>();
	for (const row of rowsOf(set, TABLE_NAME.exercise_equipment))
		if (textAt(row, COLUMN_ROLE) === MAIN_ROLE) {
			const id = textAt(row, COLUMN_EXERCISE);
			mains.set(id, (mains.get(id) ?? 0) + 1);
		}
	return rowsOf(set, TABLE_NAME.exercise).flatMap((row) => {
		const count = mains.get(textAt(row, COLUMN_ID)) ?? 0;
		return ruleCheck(
			count === 1,
			RULE.mainGear,
			slugSubject(TABLE_NAME.exercise, textAt(row, COLUMN_SLUG)),
			`главных средств ${String(count)}`
		);
	});
}

export function oneRowPerCatalogTarget(set: TableSet, catalog: SourceCatalog): Finding[] {
	const shelved = new Set(
		rowsOf(set, TABLE_NAME.exercise).map((row) => textAt(row, COLUMN_CATALOG_TARGET))
	);
	const placed = new Set(
		sourcePlacements(catalog).map(({ catalogTarget }) => catalogTarget.slug)
	);
	const lats = rowsOf(set, TABLE_NAME.target).filter((row) =>
		[LATS_ALIAS, LATS_SLUG].includes(textAt(row, COLUMN_SLUG))
	);
	return [
		...ruleCheck(
			shelved.size === placed.size,
			RULE.oneTarget,
			TABLE_NAME.target,
			`мишеней каталога ${String(shelved.size)}, мест в источниках ${String(placed.size)}`
		),
		...ruleCheck(
			lats.length === 1,
			RULE.oneTarget,
			slugSubject(TABLE_NAME.target, LATS_SLUG),
			`мишень «широчайшие» в ${String(lats.length)} экземплярах`
		)
	];
}

export function stepTargetsWithinExercise(set: TableSet): Finding[] {
	const exerciseOfStep = new Map(
		rowsOf(set, TABLE_NAME.step).map((row) => [
			textAt(row, COLUMN_ID),
			textAt(row, COLUMN_EXERCISE)
		])
	);
	const pairs = new Set(
		rowsOf(set, TABLE_NAME.exercise_target).map((row) => keyOf(row, PAIR_COLUMNS))
	);
	return rowsOf(set, TABLE_NAME.step_target).flatMap((row) => {
		const step = textAt(row, COLUMN_STEP);
		const exercise = exerciseOfStep.get(step);
		const subject = slugSubject(TABLE_NAME.step_target, step);
		if (exercise === undefined)
			return [{ message: `шага нет среди шагов`, rule: RULE.stepTarget, subject }];
		const target = textAt(row, COLUMN_TARGET);
		return ruleCheck(
			pairs.has(keyOf({ exercise_id: exercise, target_id: target }, PAIR_COLUMNS)),
			RULE.stepTarget,
			subject,
			`цель шага не принадлежит упражнению: ${target}`
		);
	});
}

export function targetKindsDeclared(set: TableSet, catalog: SourceCatalog): Finding[] {
	const targets = rowsOf(set, TABLE_NAME.target);
	const shelved = new Set(
		rowsOf(set, TABLE_NAME.exercise).map((row) => textAt(row, COLUMN_CATALOG_TARGET))
	);
	const joints = targets.filter(
		(row) =>
			textAt(row, COLUMN_KIND) === TARGET_KIND.joint && shelved.has(textAt(row, COLUMN_ID))
	);
	const unknown = targets.filter((row) => !KINDS.has(textAt(row, COLUMN_KIND)));
	const warmup = warmupTargetCount(catalog);
	return [
		...ruleCheck(
			unknown.length === 0,
			RULE.kind,
			TABLE_NAME.target,
			`вид мишени вне перечня: ${unknown.map((row) => textAt(row, COLUMN_SLUG)).join(LIST_SEPARATOR)}`
		),
		...ruleCheck(
			joints.length === warmup,
			RULE.kind,
			TABLE_NAME.target,
			`мишеней-суставов ${String(joints.length)}, мест разминки ${String(warmup)}`
		),
		...ruleCheck(
			warmup === WARMUP_JOINT_COUNT,
			RULE.kind,
			WARMUP_FILE,
			`мест разминки ${String(warmup)}, ожидается ${String(WARMUP_JOINT_COUNT)}`
		)
	];
}

export function tenMuscleGroups(set: TableSet): Finding[] {
	const rows = rowsOf(set, TABLE_NAME.muscle_group);
	return ruleCheck(
		rows.length === MUSCLE_GROUP_COUNT,
		RULE.groups,
		TABLE_NAME.muscle_group,
		`групп мышц ${String(rows.length)}, ожидается ${String(MUSCLE_GROUP_COUNT)}`
	);
}

function lineKey(oracle: string, side: string, text: string): string {
	return keyOf({ oracle_id: oracle, side, text }, LINE_COLUMNS);
}

function sourceLineKeys(oracles: readonly SourceOracle[]): readonly string[] {
	return oracles.flatMap((oracle) => [
		...oracle.model.map((text) => lineKey(oracle.id, MODEL_SIDE, text)),
		...oracle.counterModel.map((text) => lineKey(oracle.id, COUNTER_SIDE, text))
	]);
}

function verdictLineKey(oracle: string, text: string): string {
	return keyOf({ oracle_id: oracle, text }, VERDICT_LINE_COLUMNS);
}

function warmupTargetCount(catalog: SourceCatalog): number {
	return sourcePlacements(catalog).filter(({ file }) => file.slug === WARMUP_FILE).length;
}
