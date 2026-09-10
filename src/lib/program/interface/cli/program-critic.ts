import { criticExitCode, criticLines } from '../program-critic-view.ts';
import { createProgram } from '../program.ts';

const useCases = createProgram();
const reports = useCases
	.listUsers()
	.flatMap((user) => useCases.listPrograms(user.id))
	.map((program) => useCases.validateProgram(program.id));

for (const line of criticLines(reports)) console.log(line);

process.exit(criticExitCode(reports));
