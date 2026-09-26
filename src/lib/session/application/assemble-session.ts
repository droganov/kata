import type { Performed } from '../domain/novelty.ts';
import type { Redraw } from '../domain/redraw.ts';
import type { SessionGateways } from './session-gateways.ts';
import type { Redrawn, SessionView } from './session-views.ts';

import { sessionOf } from '../domain/assembly.ts';
import { noveltyOf } from '../domain/novelty.ts';
import { redrawnItem, redrawOptionsOf, rejectedAfter } from '../domain/redraw.ts';
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
): Redrawn | undefined => {
	const program = programOf(gateways, programId);
	const catalog = gateways.catalog.readCatalog();
	const item = redrawnItem(program, catalog, redraw, seed, noveltyOf(history, now));
	if (item === undefined) return;
	const rejected = rejectedAfter(redraw);
	const options = redrawOptionsOf(
		program,
		catalog,
		redraw.items.map((candidate) => (candidate.ord === item.ord ? item : candidate)),
		rejected
	);
	return {
		item: sessionItemViewOf(
			catalog,
			item,
			gateways.details.readDetails(),
			options.find((candidate) => candidate.ord === item.ord)
		),
		options,
		rejected
	};
};
