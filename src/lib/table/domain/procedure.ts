import type { SourceCatalog, SourceOracle } from './source-catalog.ts';
import type { Row } from './table.ts';

import { derivedId } from './derived-id.ts';
import { sourceOracles, sourceSteps } from './source-catalog.ts';

const FIRST_ORD = 1;
const KEY_SEPARATOR = '\u{1F}';

const ORACLE_SIDE = {
	counter: 'counter',
	model: 'model'
} as const;

export interface ProcedureTables {
	readonly oracle: readonly Row[];
	readonly oracle_line: readonly Row[];
	readonly step: readonly Row[];
	readonly step_target: readonly Row[];
	readonly verdict: readonly Row[];
	readonly verdict_line: readonly Row[];
}

type OracleSide = (typeof ORACLE_SIDE)[keyof typeof ORACLE_SIDE];

export const procedureTablesOf = (catalog: SourceCatalog): ProcedureTables => {
	const lines = oracleLineRows(catalog);
	const verdicts = verdictTablesOf(catalog, lines);
	return {
		oracle: oracleRows(catalog),
		oracle_line: lines,
		step: stepRows(catalog),
		step_target: stepTargetRows(catalog),
		verdict: verdicts.verdict,
		verdict_line: verdicts.verdict_line
	};
};

const counterLineKey = (oracleId: string, text: string): string =>
	`${oracleId}${KEY_SEPARATOR}${text}`;

const oracleLineRows = (catalog: SourceCatalog): readonly Row[] =>
	sourceOracles(catalog).flatMap((oracle) => [
		...sideRows(oracle, ORACLE_SIDE.model, oracle.model),
		...sideRows(oracle, ORACLE_SIDE.counter, oracle.counterModel)
	]);

const oracleRows = (catalog: SourceCatalog): readonly Row[] =>
	sourceSteps(catalog).flatMap(({ step }) =>
		step.oracles.map((oracle, at) => ({
			id: oracle.id,
			ord: at + FIRST_ORD,
			predicate: oracle.predicate,
			step_id: step.id
		}))
	);

const sideRows = (
	oracle: SourceOracle,
	side: OracleSide,
	texts: readonly string[]
): readonly Row[] =>
	texts.map((text, at) => ({
		id: derivedId([oracle.id, side, text]),
		oracle_id: oracle.id,
		ord: at + FIRST_ORD,
		side,
		text
	}));

const stepRows = (catalog: SourceCatalog): readonly Row[] =>
	sourceSteps(catalog).map(({ at, exercise, step }) => ({
		exercise_id: exercise.id,
		id: step.id,
		ord: at + FIRST_ORD,
		title: step.title
	}));

const stepTargetRows = (catalog: SourceCatalog): readonly Row[] =>
	sourceSteps(catalog).flatMap(({ step }) =>
		step.active.map((targetId) => ({ step_id: step.id, target_id: targetId }))
	);

const verdictTablesOf = (
	catalog: SourceCatalog,
	lines: readonly Row[]
): Pick<ProcedureTables, 'verdict' | 'verdict_line'> => {
	const idByLine = new Map(
		lines
			.filter((row) => row.side === ORACLE_SIDE.counter)
			.map((row) => [counterLineKey(String(row.oracle_id), String(row.text)), String(row.id)])
	);
	const applied = catalog.verdicts.flatMap((verdict) => {
		const lineId = idByLine.get(counterLineKey(verdict.oracle, verdict.line));
		return lineId === undefined ? [] : [{ lineId, verdict }];
	});
	const judged = new Map(
		applied.map(({ verdict }) => [
			verdict.id,
			{
				hash: verdict.hash,
				id: verdict.id,
				reason: verdict.reason ?? null,
				verdict: verdict.verdict
			}
		])
	);
	return {
		verdict: judged.values().toArray(),
		verdict_line: applied.map(({ lineId, verdict }) => ({
			line_id: lineId,
			verdict_id: verdict.id
		}))
	};
};
