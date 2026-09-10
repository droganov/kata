import type { Program } from '../domain/program.ts';

export interface ProgramRepository {
	readAll: () => readonly Program[];
}
