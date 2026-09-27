import type { Cookies } from '@sveltejs/kit';

import { AUTH_COOKIE } from '../lib/account/interface/auth-cookie.ts';

export const load = ({
	cookies
}: {
	readonly cookies: Pick<Cookies, 'get'>;
}): { readonly authSession: null | string } => ({ authSession: cookies.get(AUTH_COOKIE) ?? null });
