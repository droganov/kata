import type { SessionView } from '../application/session-views.ts';
import type { ActiveSession, Performed } from '../application/store.ts';

const OBJECT_KIND = 'object';
const NUMBER_KIND = 'number';
const STRING_KIND = 'string';
const EQUIPMENT_FIELDS = ['name', 'role'];
const TARGET_FIELDS = ['names', 'role'];
const STEP_FIELDS = ['id', 'title'];
const ORACLE_FIELDS = ['id', 'predicate'];

type StoredRecord = Readonly<Record<string, unknown>>;

export const activeSessionOf = (text: null | string): ActiveSession | undefined => {
	if (text === null) return;
	const parsed = parsedOf(text);
	return isActiveSession(parsed) ? parsed : undefined;
};

export const historyOf = (body: unknown): readonly Performed[] =>
	isRecord(body) ? performedOf(body.history) : [];

export const performedOf = (value: unknown): readonly Performed[] =>
	Array.isArray(value) ? value.filter((entry): entry is Performed => isPerformed(entry)) : [];

export const isSessionView = (value: unknown): value is SessionView =>
	isRecord(value) &&
	isListOf(value.blocks, isSessionBlock) &&
	typeof value.program === STRING_KIND &&
	typeof value.seed === NUMBER_KIND &&
	typeof value.title === STRING_KIND;

const isSessionBlock = (value: unknown): boolean =>
	isRecord(value) &&
	typeof value.id === STRING_KIND &&
	isListOf(value.items, isSessionItem) &&
	typeof value.name === STRING_KIND;

const isSessionItem = (value: unknown): boolean =>
	isRecord(value) &&
	isExerciseDetail(value.detail) &&
	typeof value.dose === STRING_KIND &&
	typeof value.exercise === STRING_KIND &&
	typeof value.name === STRING_KIND &&
	typeof value.ord === NUMBER_KIND;

const isExerciseDetail = (value: unknown): boolean =>
	isRecord(value) &&
	isListOf(value.equipment, (entry) => hasStrings(entry, EQUIPMENT_FIELDS)) &&
	(value.note === undefined || typeof value.note === STRING_KIND) &&
	isListOf(value.steps, isDetailStep) &&
	isListOf(value.targets, (entry) => hasStrings(entry, TARGET_FIELDS));

const isDetailStep = (value: unknown): boolean =>
	hasStrings(value, STEP_FIELDS) && isRecord(value) && isListOf(value.oracles, isDetailOracle);

const isDetailOracle = (value: unknown): boolean =>
	hasStrings(value, ORACLE_FIELDS) &&
	isRecord(value) &&
	isListOf(value.model, isString) &&
	isListOf(value.counterModel, isString);

const hasStrings = (value: unknown, fields: readonly string[]): boolean =>
	isRecord(value) && fields.every((field) => typeof value[field] === STRING_KIND);

const isListOf = (value: unknown, isEntry: (entry: unknown) => boolean): boolean =>
	Array.isArray(value) && value.every((entry) => isEntry(entry));

const isString = (value: unknown): boolean => typeof value === STRING_KIND;

const isActiveSession = (value: unknown): value is ActiveSession =>
	isRecord(value) &&
	typeof value.account === STRING_KIND &&
	typeof value.markedAt === STRING_KIND &&
	Array.isArray(value.marks) &&
	typeof value.openedAt === STRING_KIND &&
	isSessionView(value.view);

const isPerformed = (value: unknown): value is Performed =>
	isRecord(value) && typeof value.doneAt === STRING_KIND && typeof value.exercise === STRING_KIND;

const isRecord = (value: unknown): value is StoredRecord =>
	typeof value === OBJECT_KIND && value !== null && !Array.isArray(value);

const parsedOf = (text: string): unknown => {
	try {
		return JSON.parse(text);
	} catch {
		return text;
	}
};
