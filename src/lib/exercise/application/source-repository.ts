import type { Source } from '../domain/source.ts';

export interface SourceRepository {
	readAll: () => readonly Source[];
}
