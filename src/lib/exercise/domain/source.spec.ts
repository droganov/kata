import { describe, expect, it } from 'vitest';

import type { Source } from './source.ts';

import { uuidOfLabel } from '../../../test/uuid.ts';
import { sourceIdsOf } from './source.ts';

const sources: readonly Source[] = [
	{ exercise: uuidOfLabel('e1'), id: uuidOfLabel('s1'), title: 'NASM' },
	{ exercise: uuidOfLabel('e2'), id: uuidOfLabel('s2'), title: 'ACE' }
];

describe('sourceIdsOf', () => {
	it('собирает идентификаторы источников', () => {
		expect([...sourceIdsOf(sources)]).toEqual([uuidOfLabel('s1'), uuidOfLabel('s2')]);
	});
});
