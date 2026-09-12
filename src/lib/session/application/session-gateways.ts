import type { Catalog } from '../domain/catalog.ts';
import type { Program } from '../domain/program.ts';

export interface SessionGateways {
	readonly catalog: CatalogGateway;
	readonly programs: ProgramGateway;
}

interface CatalogGateway {
	readCatalog: () => Catalog;
}

interface ProgramGateway {
	readPrograms: () => readonly Program[];
}
