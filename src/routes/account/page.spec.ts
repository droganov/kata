import { IDBFactory } from 'fake-indexeddb';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { SIGNED_IN, signedInLayout } from '../../test/account-fixtures.ts';
import { load } from './+page.ts';

describe('load /account', () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('отдаёт вошедшего и его Сеансы', async () => {
		vi.stubGlobal('indexedDB', new IDBFactory());
		expect(await load({ parent: signedInLayout })).toEqual({
			authSessions: [],
			signedIn: SIGNED_IN
		});
	});

	it('без Сеанса ничего не читает', async () => {
		const parent = (): ReturnType<typeof signedInLayout> =>
			Promise.resolve({ hasExpiredSession: false, signedIn: undefined });
		expect(await load({ parent })).toEqual({ signedIn: undefined });
	});
});
