import type { SourceCatalog } from '../domain/source-catalog.ts';

export interface CatalogGateway {
	readSourceCatalog: () => SourceCatalog;
}
