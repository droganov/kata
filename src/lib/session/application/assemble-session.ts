import type { SessionGateways } from './session-gateways.ts';
import type { SessionView } from './session-views.ts';

import { sessionOf } from '../domain/assembly.ts';
import { programOf } from './find-program.ts';
import { sessionViewOf } from './session-views.ts';

export const assembleSession = (
	gateways: SessionGateways,
	programId: string,
	seed: number
): SessionView => {
	const program = programOf(gateways, programId);
	const catalog = gateways.catalog.readCatalog();
	return sessionViewOf(
		program,
		catalog,
		sessionOf(program, catalog, seed),
		gateways.details.readDetails()
	);
};
