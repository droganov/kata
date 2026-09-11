import { writeLines } from '../convert-view.ts';
import { createTables } from '../tables.ts';

for (const line of writeLines(createTables().writeTables())) console.log(line);
