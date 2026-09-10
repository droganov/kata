import type { Program } from '../domain/program.ts';
import type { CatalogGateway } from './catalog-gateway.ts';
import type { ExerciseGateway } from './exercise-gateway.ts';
import type { ProgramRepository } from './program-repository.ts';
import type { UserRepository } from './user-repository.ts';

const NO_PROGRAM = 'нет программы ';

export interface ProgramRepositories {
	readonly catalog: CatalogGateway;
	readonly exercises: ExerciseGateway;
	readonly programs: ProgramRepository;
	readonly users: UserRepository;
}

export function programOf(repositories: ProgramRepositories, id: string): Program {
	const found = repositories.programs.readAll().find((program) => program.id === id);
	if (found === undefined) throw new Error(`${NO_PROGRAM}${id}`);
	return found;
}
