import type { ProgramCardView, Redrawn, SessionView } from '../application/session-views.ts';
import type { Performed } from '../application/store.ts';
import type { Redraw } from '../domain/redraw.ts';

import { assembleSession, redrawSessionItemView } from '../application/assemble-session.ts';
import { findProgram } from '../application/find-program.ts';
import { listPrograms } from '../application/list-programs.ts';
import { BUNDLED_TABLES } from '../infrastructure/bundled-tables.ts';
import { cryptoSeed } from '../infrastructure/crypto-seed.ts';
import { createTableGateways } from '../infrastructure/table-gateways.ts';

export { MARKS_DELIVERED, NOTHING_TO_REDRAW } from '../infrastructure/session-endpoint.ts';
export { historyOf, redrawOf, sentMarksOf } from '../infrastructure/session-records.ts';

export interface SessionUseCases {
	assembleSession: (programId: string, history: readonly Performed[]) => SessionView;
	findProgram: (programId: string) => ProgramCardView;
	listPrograms: () => readonly ProgramCardView[];
	redrawSessionItemView: (
		programId: string,
		history: readonly Performed[],
		redraw: Redraw
	) => Redrawn | undefined;
}

const GATEWAYS = createTableGateways(BUNDLED_TABLES);

export const createSession = (
	nextSeed: () => number = cryptoSeed,
	now: () => Date = () => new Date()
): SessionUseCases => ({
	assembleSession: (programId, history) =>
		assembleSession(GATEWAYS, programId, nextSeed(), history, now()),
	findProgram: (programId) => findProgram(GATEWAYS, programId),
	listPrograms: () => listPrograms(GATEWAYS),
	redrawSessionItemView: (programId, history, redraw) =>
		redrawSessionItemView(GATEWAYS, programId, redraw, nextSeed(), history, now())
});
