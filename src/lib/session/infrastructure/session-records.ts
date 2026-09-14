import type { SessionView } from '../application/session-views.ts';
import type { ActiveSession, Performed } from '../application/store.ts';

const OBJECT_KIND = 'object';
const NUMBER_KIND = 'number';
const STRING_KIND = 'string';

type StoredRecord = Readonly<Record<string, unknown>>;

export const activeSessionOf = (text: null | string): ActiveSession | undefined => {
	if (text === null) return;
	const parsed = parsedOf(text);
	return isActiveSession(parsed) ? parsed : undefined;
};

export const performedOf = (value: unknown): readonly Performed[] =>
	Array.isArray(value) ? value.filter((entry): entry is Performed => isPerformed(entry)) : [];

export const isSessionView = (value: unknown): value is SessionView =>
	isRecord(value) &&
	Array.isArray(value.blocks) &&
	typeof value.program === STRING_KIND &&
	typeof value.seed === NUMBER_KIND &&
	typeof value.title === STRING_KIND;

const isActiveSession = (value: unknown): value is ActiveSession =>
	isRecord(value) &&
	typeof value.account === STRING_KIND &&
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
