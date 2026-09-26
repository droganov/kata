import type { Performed } from '../domain/novelty.ts';
import type { Redraw } from '../domain/redraw.ts';
import type { SessionGateways } from './session-gateways.ts';
import type { SessionItemView, SessionView } from './session-views.ts';

import { sessionOf } from '../domain/assembly.ts';
import { noveltyOf } from '../domain/novelty.ts';
import { redrawnItem } from '../domain/redraw.ts';
import { programOf } from './find-program.ts';
import { sessionItemViewOf, sessionViewOf } from './session-views.ts';

export const assembleSession = (
	gateways: SessionGateways,
	programId: string,
	seed: number,
	history: readonly Performed[],
	now: Date
): SessionView => {
	const program = programOf(gateways, programId);
	const catalog = gateways.catalog.readCatalog();
	return sessionViewOf(
		program,
		catalog,
		sessionOf(program, catalog, seed, noveltyOf(history, now)),
		gateways.details.readDetails()
	);
};

export const redrawSessionItemView = (
	gateways: SessionGateways,
	programId: string,
	redraw: Redraw,
	seed: number,
	history: readonly Performed[],
	now: Date
): SessionItemView | undefined => {
	const program = programOf(gateways, programId);
	const catalog = gateways.catalog.readCatalog();
	const item = redrawnItem(program, catalog, redraw, seed, noveltyOf(history, now));
	return item && sessionItemViewOf(program, catalog, item, gateways.details.readDetails());
};
