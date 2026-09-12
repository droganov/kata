import type { ProgramRepositories } from './program-repositories.ts';
import type { ProgramView } from './program-views.ts';

import { programViewOf } from './program-views.ts';

export const listPrograms = (
	repositories: ProgramRepositories,
	userId: string
): readonly ProgramView[] => {
	const owned = new Set(
		repositories.users
			.readAll()
			.filter((user) => user.id === userId)
			.flatMap((user) => user.programs)
	);
	return repositories.programs
		.readAll()
		.filter((program) => owned.has(program.id))
		.map((program) => programViewOf(program));
};
