import type { Finding } from '../domain/finding.ts';
import type { ProgramRepositories } from './program-repositories.ts';
import type { SessionView } from './program-views.ts';

import { programPlanOf } from '../domain/program-plan.ts';
import { rulesForProgram } from '../domain/rules/program-rules.ts';
import { planCatalogueOf } from './plan-exercises.ts';
import { programOf } from './program-repositories.ts';
import { sessionViewOf } from './program-views.ts';

export interface ProgramReport {
	readonly failureCount: number;
	readonly findings: readonly Finding[];
	readonly sessions: readonly SessionView[];
	readonly title: string;
}

export function validateProgram(
	repositories: ProgramRepositories,
	programId: string
): ProgramReport {
	const program = programOf(repositories, programId);
	const catalogue = planCatalogueOf(repositories);
	const plan = programPlanOf(program, catalogue.exercises, catalogue.hipMobilityExerciseIds);
	const findings = rulesForProgram().flatMap((rule) => rule(plan));
	return {
		failureCount: findings.length,
		findings,
		sessions: plan.sessions.map((session) => sessionViewOf(session)),
		title: program.title
	};
}
