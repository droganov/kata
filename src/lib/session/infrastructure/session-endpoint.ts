import type { SessionView } from '../application/session-views.ts';
import type { Performed } from '../application/store.ts';

import { isSessionView } from './session-records.ts';

const PROGRAMS_PATH = '/programs/';
const SESSION_PATH = '/session';
const NOT_ASSEMBLED = 'Сервер не собрал Занятие Программы: ';
const POST_METHOD = 'POST';
const JSON_HEADERS = { 'content-type': 'application/json' };

export type Fetch = (input: string, init?: RequestInit) => Promise<Response>;

export const fetchSessionView = async (
	fetcher: Fetch,
	programId: string,
	history: readonly Performed[]
): Promise<SessionView> => {
	const response = await fetcher(PROGRAMS_PATH + encodeURIComponent(programId) + SESSION_PATH, {
		body: JSON.stringify({ history }),
		headers: JSON_HEADERS,
		method: POST_METHOD
	});
	const body: unknown = response.ok ? await response.json() : undefined;
	if (!isSessionView(body)) throw new Error(NOT_ASSEMBLED + programId);
	return body;
};
