import type { CatalogGateway } from './catalog-gateway.ts';
import type { ExerciseRepository } from './exercise-repository.ts';
import type { Hasher } from './hasher.ts';
import type { SourceRepository } from './source-repository.ts';
import type { VerdictRepository } from './verdict-repository.ts';

export interface ExerciseRepositories {
	readonly catalog: CatalogGateway;
	readonly exercises: ExerciseRepository;
	readonly hasher: Hasher;
	readonly sources: SourceRepository;
	readonly verdicts: VerdictRepository;
}
