import { describe, expect, it } from 'vitest';

import type { Source } from './source.ts';

import { sourceIdsOf } from './source.ts';

const sources = [
	{ exercise: 'e1', id: 's1', title: 'NASM' },
	{ exercise: 'e2', id: 's2', title: 'ACE' }
] as unknown as readonly Source[];

describe('sourceIdsOf', () => {
	it('собирает идентификаторы источников', () => {
		expect([...sourceIdsOf(sources)]).toEqual(['s1', 's2']);
	});
});
