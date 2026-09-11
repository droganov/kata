import { criticExitCode, criticLines } from '../table-critic-view.ts';
import { createTables } from '../tables.ts';

const report = createTables().validateTables();

for (const line of criticLines(report)) console.log(line);

process.exit(criticExitCode(report));
