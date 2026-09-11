import type { SourceCatalog, SourceOracle } from './source-catalog.ts';
import type { Row } from './table.ts';

import { derivedId } from './derived-id.ts';
import { sourceOracles, sourceSteps } from './source-catalog.ts';

const FIRST_ORD = 1;
const KEY_SEPARATOR = '\u{1F}';
const VERDICT_MARK = 'verdict';

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
}

type OracleSide = (typeof ORACLE_SIDE)[keyof typeof ORACLE_SIDE];

export function procedureTablesOf(catalog: SourceCatalog): ProcedureTables {
	const lines = oracleLineRows(catalog);
	return {
		oracle: oracleRows(catalog),
		oracle_line: lines,
		step: stepRows(catalog),
		step_target: stepTargetRows(catalog),
		verdict: verdictRows(catalog, lines)
	};
}

function counterLineKey(oracleId: string, text: string): string {
	return `${oracleId}${KEY_SEPARATOR}${text}`;
}

function oracleLineRows(catalog: SourceCatalog): readonly Row[] {
	return sourceOracles(catalog).flatMap((oracle) => [
		...sideRows(oracle, ORACLE_SIDE.model, oracle.model),
		...sideRows(oracle, ORACLE_SIDE.counter, oracle.counterModel)
	]);
}

function oracleRows(catalog: SourceCatalog): readonly Row[] {
	return sourceSteps(catalog).flatMap(({ step }) =>
		step.oracles.map((oracle, at) => ({
			id: oracle.id,
			ord: at + FIRST_ORD,
			predicate: oracle.predicate,
			step_id: step.id
		}))
	);
}

function sideRows(
	oracle: SourceOracle,
	side: OracleSide,
	texts: readonly string[]
): readonly Row[] {
	return texts.map((text, at) => ({
		id: derivedId([oracle.id, side, text]),
		oracle_id: oracle.id,
		ord: at + FIRST_ORD,
		side,
		text
	}));
}

function stepRows(catalog: SourceCatalog): readonly Row[] {
	return sourceSteps(catalog).map(({ at, exercise, step }) => ({
		exercise_id: exercise.id,
		id: step.id,
		ord: at + FIRST_ORD,
		title: step.title
	}));
}

function stepTargetRows(catalog: SourceCatalog): readonly Row[] {
	return sourceSteps(catalog).flatMap(({ step }) =>
		step.active.map((targetId) => ({ step_id: step.id, target_id: targetId }))
	);
}

function verdictRows(catalog: SourceCatalog, lines: readonly Row[]): readonly Row[] {
	const idByLine = new Map(
		lines
			.filter((row) => row.side === ORACLE_SIDE.counter)
			.map((row) => [counterLineKey(String(row.oracle_id), String(row.text)), String(row.id)])
	);
	return catalog.verdicts.flatMap((verdict) => {
		const lineId = idByLine.get(counterLineKey(verdict.oracle, verdict.line));
		return lineId === undefined
			? []
			: [
					{
						hash: verdict.hash,
						id: derivedId([lineId, VERDICT_MARK]),
						line_id: lineId,
						reason: verdict.reason ?? null,
						verdict: verdict.verdict
					}
				];
	});
}
