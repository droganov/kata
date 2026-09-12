import type { ProgramRepositories } from './program-repositories.ts';
import type { SessionView } from './program-views.ts';

import { sessionsOf } from '../domain/rotation.ts';
import { planCatalogueOf } from './plan-exercises.ts';
import { programOf } from './program-repositories.ts';
import { sessionViewOf } from './program-views.ts';

export const buildSessions = (
	repositories: ProgramRepositories,
	programId: string
): readonly SessionView[] => {
	const program = programOf(repositories, programId);
	return sessionsOf(program, planCatalogueOf(repositories).exercises).map((session) =>
		sessionViewOf(session)
	);
};
