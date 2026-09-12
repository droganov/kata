import type { Uuid } from '../../shared/uuid.ts';

export interface Source {
	readonly exercise: Uuid;
	readonly id: Uuid;
	readonly note?: string;
	readonly title: string;
	readonly url?: string;
}

export const sourceIdsOf = (sources: readonly Source[]): ReadonlySet<string> =>
	new Set(sources.map((source) => source.id));
