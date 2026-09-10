import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(HERE, '../../../..');
const DATA_DIRECTORY = 'data';
const BANKS_DIRECTORY = 'banks';
const SCHEMA_DIRECTORY = 'schema';
const EQUIPMENT_FILE = 'equipment.json';
const TARGETS_FILE = 'targets.json';

export const CATALOG_PATHS = {
	banks: path.join(PROJECT_ROOT, DATA_DIRECTORY, BANKS_DIRECTORY),
	equipment: path.join(PROJECT_ROOT, DATA_DIRECTORY, EQUIPMENT_FILE),
	schema: path.join(PROJECT_ROOT, SCHEMA_DIRECTORY),
	targets: path.join(PROJECT_ROOT, DATA_DIRECTORY, TARGETS_FILE)
};
