import type { ProgramRepositories } from './program-repositories.ts';
import type { ProgramView } from './program-views.ts';

import { programViewOf } from './program-views.ts';

export function findProgram(
	repositories: ProgramRepositories,
	id: string
): ProgramView | undefined {
	const found = repositories.programs.readAll().find((program) => program.id === id);
	return found === undefined ? undefined : programViewOf(found);
}
