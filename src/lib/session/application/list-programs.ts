import type { SessionGateways } from './session-gateways.ts';
import type { ProgramCardView } from './session-views.ts';

import { programCardOf } from './session-views.ts';

export const listPrograms = (gateways: SessionGateways): readonly ProgramCardView[] =>
	gateways.programs
		.readPrograms()
		.map((program) => programCardOf(program))
		.toSorted((first, second) => first.title.localeCompare(second.title));
