import type { ProgramCardView } from '../lib/session/application/session-views.ts';

import { createSession } from '../lib/session/interface/session.ts';

export const load = (): { readonly programs: readonly ProgramCardView[] } => ({
	programs: createSession().listPrograms()
});
