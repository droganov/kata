import type { ProgramCardView } from '../../../lib/session/application/session-views.ts';

import { createSession } from '../../../lib/session/interface/session.ts';

export const load = ({
	params
}: {
	readonly params: { readonly program: string };
}): { readonly program: ProgramCardView } => ({
	program: createSession().findProgram(params.program)
});
