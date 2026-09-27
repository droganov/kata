import { describe, expect, it } from 'vitest';

import { load } from './+layout.server.ts';

const SESSION = '01a0e029-5400-7000-8000-000000000001';

describe('load раскладки на сервере', () => {
	it('отдаёт токен Сеанса из куки, которую скрипт не читает', () => {
		const cookies = { get: (name: string) => (name === 'training-auth' ? SESSION : undefined) };
		expect(load({ cookies })).toEqual({ authSession: SESSION });
	});

	it('без куки токена нет', () => {
		expect(
			load({ cookies: { get: (name: string) => new Map<string, string>().get(name) } })
		).toEqual({ authSession: null });
	});
});
