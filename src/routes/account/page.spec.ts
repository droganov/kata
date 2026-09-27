import { describe, expect, it } from 'vitest';

import { SIGNED_IN, signedInLayout } from '../../test/account-fixtures.ts';
import { load } from './+page.ts';

describe('load /account', () => {
	it('отдаёт вошедшего', async () => {
		expect(await load({ parent: signedInLayout })).toEqual({ signedIn: SIGNED_IN });
	});

	it('без Сеанса ничего не читает', async () => {
		const parent = (): ReturnType<typeof signedInLayout> =>
			Promise.resolve({ hasExpiredSession: false, signedIn: undefined });
		expect(await load({ parent })).toEqual({ signedIn: undefined });
	});
});
