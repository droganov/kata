import type { SessionItemView, SessionView } from '../application/session-views.ts';
import type { Performed } from '../application/store.ts';
import type { Redraw } from '../domain/redraw.ts';

import { isSessionItemView, isSessionView } from './session-records.ts';

const PROGRAMS_PATH = '/programs/';
const SESSION_PATH = '/session';
const NOT_ASSEMBLED = 'Сервер не собрал Занятие Программы: ';
const NOT_REDRAWN = 'Сервер не пересобрал Позицию Занятия Программы: ';
const REDRAW_PATH = '/redraw';

export const NOTHING_TO_REDRAW = 409;
const POST_METHOD = 'POST';
const JSON_HEADERS = { 'content-type': 'application/json' };

export type Fetch = (input: string, init?: RequestInit) => Promise<Response>;

export const fetchSessionView = async (
	fetcher: Fetch,
	programId: string,
	history: readonly Performed[]
): Promise<SessionView> => {
	const response = await fetcher(sessionPathOf(programId), {
		body: JSON.stringify({ history }),
		headers: JSON_HEADERS,
		method: POST_METHOD
	});
	const body: unknown = response.ok ? await response.json() : undefined;
	if (!isSessionView(body)) throw new Error(NOT_ASSEMBLED + programId);
	return body;
};

export const fetchRedrawnItem = async (
	fetcher: Fetch,
	programId: string,
	history: readonly Performed[],
	redraw: Redraw
): Promise<SessionItemView | undefined> => {
	const response = await fetcher(sessionPathOf(programId) + REDRAW_PATH, {
		body: JSON.stringify({ history, redraw }),
		headers: JSON_HEADERS,
		method: POST_METHOD
	});
	if (response.status === NOTHING_TO_REDRAW) return;
	const body: unknown = response.ok ? await response.json() : undefined;
	if (!isSessionItemView(body)) throw new Error(NOT_REDRAWN + programId);
	return body;
};

const sessionPathOf = (programId: string): string =>
	PROGRAMS_PATH + encodeURIComponent(programId) + SESSION_PATH;
