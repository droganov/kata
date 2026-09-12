import type { Verdict } from '../domain/verdict.ts';
import type { VerdictRepository } from './verdict-repository.ts';

import { mergeVerdicts } from '../domain/verdict.ts';

export interface VerdictMerge {
	readonly added: number;
	readonly total: number;
}

export const applyVerdicts = (
	repository: VerdictRepository,
	incoming: readonly Verdict[]
): VerdictMerge => {
	const stored = repository.readAll();
	const merged = mergeVerdicts(stored, incoming);
	repository.save(merged);
	return { added: merged.length - stored.length, total: merged.length };
};
