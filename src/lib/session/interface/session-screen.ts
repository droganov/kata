import type { ActiveSession } from '../application/store.ts';
import type { BrowserSession } from './browser-session.ts';

import { openedItemOf } from '../application/session-place.ts';

const ITEM_PARAM = 'item';
const BLOCK_PARAM = 'block';
const QUERY_START = '?';
const DISCLOSURE_PREFIX = 'training:disclosure:';
const KEY_SEPARATOR = ':';
const DISCLOSURE_OPEN = 'open';
const ORD_PATTERN = /^\d+$/v;

export interface SessionScreen extends BrowserSession {
	readonly current?: number;
	readonly openDisclosures: readonly string[];
	readonly openedBlock?: string;
}

export const sessionScreenOf = (
	started: BrowserSession,
	params: URLSearchParams
): SessionScreen => {
	const current = openedItemOf(started.session, requestedItemOf(params.get(ITEM_PARAM)));
	const openedBlock = params.get(BLOCK_PARAM) ?? undefined;
	return {
		...started,
		...(current !== undefined && { current }),
		openDisclosures: openDisclosures(),
		...(openedBlock !== undefined && { openedBlock })
	};
};

export const sessionItemAddress = (ord: number, block?: string): string => {
	const params = new URLSearchParams({ [ITEM_PARAM]: String(ord) });
	if (block !== undefined) params.set(BLOCK_PARAM, block);
	return QUERY_START + params.toString();
};

export const disclosureKeyOf = (session: ActiveSession, ord: number, element: string): string =>
	DISCLOSURE_PREFIX + [session.view.seed, ord, element].join(KEY_SEPARATOR);

export const openDisclosure = (key: string): void => {
	sessionStorage.setItem(key, DISCLOSURE_OPEN);
};

export const closeDisclosure = (key: string): void => {
	sessionStorage.removeItem(key);
};

const openDisclosures = (): readonly string[] =>
	Array.from({ length: sessionStorage.length }, (_, index) => sessionStorage.key(index)).filter(
		(key): key is string => key?.startsWith(DISCLOSURE_PREFIX) === true
	);

const requestedItemOf = (value: null | string): number | undefined =>
	value !== null && ORD_PATTERN.test(value) ? Number(value) : undefined;
