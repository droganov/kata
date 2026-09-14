import type { Program } from '../domain/program.ts';
import type { SessionGateways } from './session-gateways.ts';
import type { ProgramCardView } from './session-views.ts';

import { programCardOf } from './session-views.ts';

const NO_PROGRAM = 'Программы нет: ';

export const programOf = (gateways: SessionGateways, programId: string): Program => {
	const program = gateways.programs.readPrograms().find((item) => item.id === programId);
	if (program === undefined) throw new Error(NO_PROGRAM + programId);
	return program;
};

export const findProgram = (gateways: SessionGateways, programId: string): ProgramCardView =>
	programCardOf(programOf(gateways, programId));
