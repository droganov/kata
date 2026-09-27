import { isUuid } from '../../shared/uuid.ts';

const OBJECT_KIND = 'object';
const STRING_KIND = 'string';
const COOKIE_DAYS = 400;
const DAY_SECONDS = 86_400;

export const AUTH_COOKIE = 'training-auth';

export const AUTH_COOKIE_OPTIONS = {
	httpOnly: true,
	maxAge: COOKIE_DAYS * DAY_SECONDS,
	path: '/',
	sameSite: 'lax'
} as const;

export const authSessionOf = async (request: Request): Promise<string | undefined> => {
	const body = await bodyOf(request);
	if (!isRecord(body)) return;
	const { authSession } = body;
	return isSessionToken(authSession) ? authSession : undefined;
};

const isSessionToken = (value: unknown): value is string =>
	typeof value === STRING_KIND && isUuid(String(value));

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> =>
	typeof value === OBJECT_KIND && value !== null;

const bodyOf = async (request: Request): Promise<unknown> => {
	try {
		return await request.json();
	} catch {
		return undefined;
	}
};
