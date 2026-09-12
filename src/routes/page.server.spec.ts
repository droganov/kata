import { describe, expect, it } from 'vitest';

import { load } from './+page.server.ts';

describe('load /', () => {
	it('отдаёт список Программ', () => {
		expect(load().programs.map((program) => program.title)).toEqual(['Закрепления и добор']);
	});
});
