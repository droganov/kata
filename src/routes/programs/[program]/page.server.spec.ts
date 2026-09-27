import { describe, expect, it } from 'vitest';

import { load } from './+page.server.ts';

describe('load /programs/[program] на сервере', () => {
	it('отдаёт карточку Программы', () => {
		expect(load({ params: { program: '01a0889d-8ae8-7c8a-b964-0ead5f668a5a' } })).toEqual({
			program: {
				id: '01a0889d-8ae8-7c8a-b964-0ead5f668a5a',
				title: 'Программа: БАЗА + ПУЛ'
			}
		});
	});
});
