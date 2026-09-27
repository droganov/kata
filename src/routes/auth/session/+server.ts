import type { Cookies } from '@sveltejs/kit';

import {
	AUTH_COOKIE,
	AUTH_COOKIE_OPTIONS,
	authSessionOf
} from '../../../lib/account/interface/auth-cookie.ts';

const NO_CONTENT = 204;
const BAD_REQUEST = 400;

export const POST = async ({
	cookies,
	request
}: {
	readonly cookies: Pick<Cookies, 'set'>;
	readonly request: Request;
}): Promise<Response> => {
	const session = await authSessionOf(request);
	if (session === undefined) return new Response(null, { status: BAD_REQUEST });
	cookies.set(AUTH_COOKIE, session, AUTH_COOKIE_OPTIONS);
	return new Response(null, { status: NO_CONTENT });
};

export const DELETE = ({ cookies }: { readonly cookies: Pick<Cookies, 'delete'> }): Response => {
	cookies.delete(AUTH_COOKIE, { path: AUTH_COOKIE_OPTIONS.path });
	return new Response(null, { status: NO_CONTENT });
};
