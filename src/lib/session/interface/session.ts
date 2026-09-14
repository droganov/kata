import type { ProgramCardView, SessionView } from '../application/session-views.ts';

import { assembleSession } from '../application/assemble-session.ts';
import { findProgram } from '../application/find-program.ts';
import { listPrograms } from '../application/list-programs.ts';
import { BUNDLED_TABLES } from '../infrastructure/bundled-tables.ts';
import { cryptoSeed } from '../infrastructure/crypto-seed.ts';
import { createTableGateways } from '../infrastructure/table-gateways.ts';

export interface SessionUseCases {
	assembleSession: (programId: string) => SessionView;
	findProgram: (programId: string) => ProgramCardView;
	listPrograms: () => readonly ProgramCardView[];
}

const GATEWAYS = createTableGateways(BUNDLED_TABLES);

export const createSession = (nextSeed: () => number = cryptoSeed): SessionUseCases => ({
	assembleSession: (programId) => assembleSession(GATEWAYS, programId, nextSeed()),
	findProgram: (programId) => findProgram(GATEWAYS, programId),
	listPrograms: () => listPrograms(GATEWAYS)
});
