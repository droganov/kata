import type { SessionGateways } from './session-gateways.ts';
import type { SessionView } from './session-views.ts';

import { sessionOf } from '../domain/assembly.ts';
import { sessionViewOf } from './session-views.ts';

const NO_PROGRAM = 'Программы нет: ';

export const assembleSession = (
	gateways: SessionGateways,
	programId: string,
	seed: number
): SessionView => {
	const program = gateways.programs.readPrograms().find((item) => item.id === programId);
	if (program === undefined) throw new Error(NO_PROGRAM + programId);
	const catalog = gateways.catalog.readCatalog();
	return sessionViewOf(
		program,
		catalog,
		sessionOf(program, catalog, seed),
		gateways.details.readDetails()
	);
};
