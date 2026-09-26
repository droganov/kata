import type { ProgramCardView } from '../lib/session/application/session-views.ts';
import type { ActiveSession } from '../lib/session/application/store.ts';

import { redrawableBrowserSessions } from '../lib/session/interface/browser-session.ts';

export interface ProgramList {
	readonly programs: readonly ProgramCardView[];
	readonly redrawable: readonly ActiveSession[];
}

export const load = async ({
	data
}: {
	readonly data: { readonly programs: readonly ProgramCardView[] };
}): Promise<ProgramList> => ({
	...data,
	redrawable: await redrawableBrowserSessions(data.programs)
});
