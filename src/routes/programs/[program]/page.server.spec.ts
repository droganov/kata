import { describe, expect, it } from 'vitest';

import { load } from './+page.server.ts';

describe('load /programs/[program]', () => {
	it('отдаёт собранное Занятие выбранной Программы', () => {
		const view = load({ params: { program: '01a0889d-8ae8-7c8a-b964-0ead5f668a5a' } });
		expect(view.blocks).toHaveLength(5);
	});
});
