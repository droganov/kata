import type { UserView } from '../application/list-users.ts';
import type { ProgramOutlineView } from '../application/outline-program.ts';
import type { ProgramRepositories } from '../application/program-repositories.ts';
import type { ProgramView, SessionView } from '../application/program-views.ts';
import type { ProgramReport } from '../application/validate-program.ts';

import { buildSessions } from '../application/build-sessions.ts';
import { findProgram } from '../application/find-program.ts';
import { listPrograms } from '../application/list-programs.ts';
import { listUsers } from '../application/list-users.ts';
import { outlineProgram } from '../application/outline-program.ts';
import { validateProgram } from '../application/validate-program.ts';
import { createCatalogJsonGateway } from '../infrastructure/catalog-json-gateway.ts';
import { createExerciseJsonGateway } from '../infrastructure/exercise-json-gateway.ts';
import { createJsonProgramRepository } from '../infrastructure/json-program-repository.ts';
import { createSchemaValidator } from '../infrastructure/json-schema-validator.ts';
import { createJsonUserRepository } from '../infrastructure/json-user-repository.ts';
import { PROGRAM_PATHS } from '../infrastructure/program-paths.ts';

export interface ProgramUseCases {
	buildSessions: (programId: string) => readonly SessionView[];
	findProgram: (id: string) => ProgramView | undefined;
	listPrograms: (userId: string) => readonly ProgramView[];
	listUsers: () => readonly UserView[];
	outlineProgram: (programId: string) => ProgramOutlineView;
	validateProgram: (programId: string) => ProgramReport;
}

export function createProgram(): ProgramUseCases {
	const validator = createSchemaValidator(PROGRAM_PATHS.schema);
	const repositories: ProgramRepositories = {
		catalog: createCatalogJsonGateway({
			banksDirectory: PROGRAM_PATHS.banks,
			targetsFile: PROGRAM_PATHS.targets,
			validator
		}),
		exercises: createExerciseJsonGateway({ directory: PROGRAM_PATHS.banks, validator }),
		programs: createJsonProgramRepository({ file: PROGRAM_PATHS.programs, validator }),
		users: createJsonUserRepository({ file: PROGRAM_PATHS.users, validator })
	};
	return {
		buildSessions: (programId) => buildSessions(repositories, programId),
		findProgram: (id) => findProgram(repositories, id),
		listPrograms: (userId) => listPrograms(repositories, userId),
		listUsers: () => listUsers(repositories),
		outlineProgram: (programId) => outlineProgram(repositories, programId),
		validateProgram: (programId) => validateProgram(repositories, programId)
	};
}
