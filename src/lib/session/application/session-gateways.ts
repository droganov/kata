import type { Catalog } from '../domain/catalog.ts';
import type { ExerciseDetail } from '../domain/exercise-detail.ts';
import type { Program } from '../domain/program.ts';

export interface SessionGateways {
	readonly catalog: CatalogGateway;
	readonly details: DetailGateway;
	readonly programs: ProgramGateway;
}

interface CatalogGateway {
	readCatalog: () => Catalog;
}

interface DetailGateway {
	readDetails: () => ReadonlyMap<string, ExerciseDetail>;
}

interface ProgramGateway {
	readPrograms: () => readonly Program[];
}
