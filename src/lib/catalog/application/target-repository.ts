import type { Target } from '../domain/target.ts';

export interface TargetRepository {
	readAll: () => readonly Target[];
}
