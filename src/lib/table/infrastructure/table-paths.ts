import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(HERE, '../../../..');
const DATA_DIRECTORY = 'data';
const MODALITY_DIRECTORY = 'banks';
const SCHEMA_DIRECTORY = 'schema';
const EQUIPMENT_FILE = 'equipment.json';
const PROGRAMS_FILE = 'programs.json';
const REFERENCES_FILE = 'sources.json';
const TARGETS_FILE = 'targets.json';
const VERDICTS_FILE = 'verdicts.json';

export const TABLE_PATHS = {
	equipment: path.join(PROJECT_ROOT, DATA_DIRECTORY, EQUIPMENT_FILE),
	modalities: path.join(PROJECT_ROOT, DATA_DIRECTORY, MODALITY_DIRECTORY),
	programs: path.join(PROJECT_ROOT, DATA_DIRECTORY, PROGRAMS_FILE),
	references: path.join(PROJECT_ROOT, DATA_DIRECTORY, REFERENCES_FILE),
	schema: path.join(PROJECT_ROOT, SCHEMA_DIRECTORY),
	tables: path.join(PROJECT_ROOT, DATA_DIRECTORY),
	targets: path.join(PROJECT_ROOT, DATA_DIRECTORY, TARGETS_FILE),
	verdicts: path.join(PROJECT_ROOT, DATA_DIRECTORY, VERDICTS_FILE)
};
