import type { Uuid } from '../../shared/uuid.ts';

const HASH_SEPARATOR = '\n';
const KEY_SEPARATOR = '\n';

const VERDICT_KIND = {
	independent: 'independent',
	negation: 'negation',
	unobservable: 'unobservable'
} as const;

export interface Verdict {
	readonly hash: string;
	readonly id: Uuid;
	readonly line: string;
	readonly oracle: Uuid;
	readonly reason?: string;
	readonly verdict: VerdictKind;
}

type VerdictKind = (typeof VERDICT_KIND)[keyof typeof VERDICT_KIND];

export const counterLineKey = (oracle: string, line: string): string =>
	`${oracle}${KEY_SEPARATOR}${line}`;

export const independentHashesOf = (verdicts: readonly Verdict[]): ReadonlySet<string> =>
	new Set(
		verdicts
			.filter((verdict) => verdict.verdict === VERDICT_KIND.independent)
			.map((verdict) => verdict.hash)
	);

export const mergeVerdicts = (
	stored: readonly Verdict[],
	incoming: readonly Verdict[]
): readonly Verdict[] => {
	const byLine = new Map(
		stored.map((verdict) => [counterLineKey(verdict.oracle, verdict.line), verdict])
	);
	for (const verdict of incoming)
		byLine.set(counterLineKey(verdict.oracle, verdict.line), verdict);
	return byLine.values().toArray();
};

export const verdictHashText = (
	predicate: string,
	stepModel: readonly string[],
	line: string
): string => [predicate, ...stepModel, line].join(HASH_SEPARATOR);
