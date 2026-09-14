import type { SessionView } from '../application/session-views.ts';

import { isSessionView } from './session-records.ts';

const PROGRAMS_PATH = '/programs/';
const SESSION_PATH = '/session';
const NOT_ASSEMBLED = 'Сервер не собрал Занятие Программы: ';

export type Fetch = (input: string) => Promise<Response>;

export const fetchSessionView = async (fetcher: Fetch, programId: string): Promise<SessionView> => {
	const response = await fetcher(PROGRAMS_PATH + encodeURIComponent(programId) + SESSION_PATH);
	const body: unknown = response.ok ? await response.json() : undefined;
	if (!isSessionView(body)) throw new Error(NOT_ASSEMBLED + programId);
	return body;
};
