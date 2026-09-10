import type { Verdict } from '../domain/verdict.ts';

export interface VerdictRepository {
	readAll: () => readonly Verdict[];
	save: (verdicts: readonly Verdict[]) => void;
}
