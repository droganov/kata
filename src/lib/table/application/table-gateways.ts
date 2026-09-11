import type { CatalogGateway } from './catalog-gateway.ts';
import type { TableRepository } from './table-repository.ts';

export interface TableGateways {
	readonly catalog: CatalogGateway;
	readonly tables: TableRepository;
}
