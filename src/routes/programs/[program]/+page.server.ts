import type { SessionView } from '../../../lib/session/application/session-views.ts';

import { createSession } from '../../../lib/session/interface/session.ts';

export const load = ({ params }: { readonly params: { readonly program: string } }): SessionView =>
	createSession().assembleSession(params.program);
