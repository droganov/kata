import type { Redrawn, SessionView } from '../application/session-views.ts';
import type { Performed } from '../application/store.ts';
import type { UnsentMark } from '../application/unsent-marks.ts';
import type { Redraw } from '../domain/redraw.ts';

import { isRedrawn, isSessionView } from './session-records.ts';

const PROGRAMS_PATH = '/programs/';
const SESSION_PATH = '/session';
const NOT_ASSEMBLED = 'Сервер не собрал Занятие Программы: ';
const NOT_REDRAWN = 'Сервер не пересобрал Позицию Занятия Программы: ';
const REDRAW_PATH = '/redraw';
const MARKS_PATH = '/marks';
const NO_STORE = 'no-store';
const DELIVERY_TIMEOUT_MS = 8000;

export const NOTHING_TO_REDRAW = 409;
export const MARKS_DELIVERED = 204;
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
): Promise<Redrawn | undefined> => {
	const response = await fetcher(sessionPathOf(programId) + REDRAW_PATH, {
		body: JSON.stringify({ history, redraw }),
		headers: JSON_HEADERS,
		method: POST_METHOD
	});
	if (response.status === NOTHING_TO_REDRAW) return;
	const body: unknown = response.ok ? await response.json() : undefined;
	if (!isRedrawn(body)) throw new Error(NOT_REDRAWN + programId);
	return body;
};

export const hasDeliveredMarks = async (
	fetcher: Fetch,
	marks: readonly UnsentMark[]
): Promise<boolean> => {
	const deadline = new AbortController();
	const timer = setTimeout(() => {
		deadline.abort();
	}, DELIVERY_TIMEOUT_MS);
	try {
		const response = await fetcher(MARKS_PATH, {
			body: JSON.stringify({ marks }),
			cache: NO_STORE,
			headers: JSON_HEADERS,
			method: POST_METHOD,
			signal: deadline.signal
		});
		return response.status === MARKS_DELIVERED;
	} catch {
		return false;
	} finally {
		clearTimeout(timer);
	}
};

const sessionPathOf = (programId: string): string =>
	PROGRAMS_PATH + encodeURIComponent(programId) + SESSION_PATH;
