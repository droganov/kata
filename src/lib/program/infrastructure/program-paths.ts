import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(HERE, '../../../..');
const DATA_DIRECTORY = 'data';
const BANKS_DIRECTORY = 'banks';
const SCHEMA_DIRECTORY = 'schema';
const PROGRAMS_FILE = 'programs.json';
const TARGETS_FILE = 'targets.json';
const USERS_FILE = 'users.json';

export const PROGRAM_PATHS = {
	banks: path.join(PROJECT_ROOT, DATA_DIRECTORY, BANKS_DIRECTORY),
	programs: path.join(PROJECT_ROOT, DATA_DIRECTORY, PROGRAMS_FILE),
	schema: path.join(PROJECT_ROOT, SCHEMA_DIRECTORY),
	targets: path.join(PROJECT_ROOT, DATA_DIRECTORY, TARGETS_FILE),
	users: path.join(PROJECT_ROOT, DATA_DIRECTORY, USERS_FILE)
};
