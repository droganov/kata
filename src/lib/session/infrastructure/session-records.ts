import type { Redrawn, SessionItemView, SessionView } from '../application/session-views.ts';
import type { ActiveSession, Performed, Rejected } from '../application/store.ts';
import type { Redraw, RedrawOptions, SessionItemRef } from '../domain/redraw.ts';

import { isRedrawLevel } from '../domain/redraw.ts';

const OBJECT_KIND = 'object';
const NUMBER_KIND = 'number';
const STRING_KIND = 'string';
const BOOLEAN_KIND = 'boolean';
const ITEM_REF_FIELDS = ['block', 'exercise', 'target'];
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

export const redrawOf = (body: unknown): Redraw | undefined => {
	if (!isRecord(body)) return;
	const { redraw } = body;
	return isRedraw(redraw) ? redraw : undefined;
};

export const isRedrawn = (value: unknown): value is Redrawn =>
	isRecord(value) &&
	isSessionItemView(value.item) &&
	isListOf(value.options, isRedrawOptions) &&
	isRejected(value.rejected);

export const isSessionView = (value: unknown): value is SessionView =>
	isRecord(value) &&
	isListOf(value.blocks, isSessionBlock) &&
	typeof value.program === STRING_KIND &&
	typeof value.seed === NUMBER_KIND &&
	typeof value.title === STRING_KIND;

const isSessionBlock = (value: unknown): boolean =>
	isRecord(value) &&
	typeof value.id === STRING_KIND &&
	isListOf(value.items, isSessionItemView) &&
	typeof value.name === STRING_KIND;

const isSessionItemView = (value: unknown): value is SessionItemView =>
	isRecord(value) &&
	isExerciseDetail(value.detail) &&
	typeof value.dose === STRING_KIND &&
	typeof value.drawNo === NUMBER_KIND &&
	typeof value.exercise === STRING_KIND &&
	typeof value.isExerciseRedrawable === BOOLEAN_KIND &&
	typeof value.isTargetRedrawable === BOOLEAN_KIND &&
	typeof value.name === STRING_KIND &&
	typeof value.ord === NUMBER_KIND &&
	typeof value.target === STRING_KIND;

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
	isRejected(value.rejected) &&
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

const isSessionItemRef = (value: unknown): value is SessionItemRef =>
	hasStrings(value, ITEM_REF_FIELDS) && isRecord(value) && typeof value.ord === NUMBER_KIND;

const isRedraw = (value: unknown): value is Redraw =>
	isRecord(value) &&
	isListOf(value.items, isSessionItemRef) &&
	isRedrawLevel(value.level) &&
	typeof value.ord === NUMBER_KIND &&
	isRejected(value.rejected);

const isRejected = (value: unknown): value is Rejected =>
	isRecord(value) && isListOf(value.exercises, isString) && isListOf(value.targets, isString);

const isRedrawOptions = (value: unknown): value is RedrawOptions =>
	isRecord(value) &&
	typeof value.isExerciseRedrawable === BOOLEAN_KIND &&
	typeof value.isTargetRedrawable === BOOLEAN_KIND &&
	typeof value.ord === NUMBER_KIND;
