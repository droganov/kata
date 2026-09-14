import { describe, expect, it } from 'vitest';

import { GET } from './+server.ts';

const PROGRAM_ID = '01a0889d-8ae8-7c8a-b964-0ead5f668a5a';

describe('GET /programs/[program]/session', () => {
	it('собирает на сервере Занятие выбранной Программы', async () => {
		const view: unknown = await GET({ params: { program: PROGRAM_ID } }).json();
		expect(view).toMatchObject({ program: PROGRAM_ID, title: 'Программа: БАЗА + ПУЛ' });
	});
});
