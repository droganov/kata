import type { ProgramRepositories } from './program-repositories.ts';

export interface UserView {
	readonly id: string;
	readonly name: string;
	readonly programs: readonly string[];
}

export function listUsers(repositories: ProgramRepositories): readonly UserView[] {
	return repositories.users
		.readAll()
		.map((user) => ({ id: user.id, name: user.name, programs: user.programs }));
}
