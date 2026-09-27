const AUTH_SESSION_PATH = '/auth/session';
const POST_METHOD = 'POST';
const DELETE_METHOD = 'DELETE';
const JSON_HEADERS = { 'content-type': 'application/json' };
const NOT_REMEMBERED = 'Сервер не запомнил Сеанс';
const NOT_FORGOTTEN = 'Сервер не забыл Сеанс';

export type Fetch = (input: string, init?: RequestInit) => Promise<Response>;

export const rememberAuthSession = async (fetcher: Fetch, authSession: string): Promise<void> => {
	const response = await fetcher(AUTH_SESSION_PATH, {
		body: JSON.stringify({ authSession }),
		headers: JSON_HEADERS,
		method: POST_METHOD
	});
	if (!response.ok) throw new Error(NOT_REMEMBERED);
};

export const forgetAuthSession = async (fetcher: Fetch): Promise<void> => {
	const response = await fetcher(AUTH_SESSION_PATH, { method: DELETE_METHOD });
	if (!response.ok) throw new Error(NOT_FORGOTTEN);
};
