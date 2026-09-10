import { criticExitCode, criticLines } from '../catalog-critic-view.ts';
import { createCatalog } from '../catalog.ts';

const report = createCatalog().validateCatalog();

for (const line of criticLines(report)) console.log(line);

process.exit(criticExitCode(report));
