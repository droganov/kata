import { describe, expect, it, vi } from 'vitest';

import type { Verdict } from '../domain/verdict.ts';

import { uuidOfLabel } from '../../../test/uuid.ts';
import { applyVerdicts } from './apply-verdicts.ts';

const verdictOf = (hash: string, verdict: Verdict['verdict'], line = 'строка'): Verdict => ({
	hash,
	id: uuidOfLabel(`id-${hash}`),
	line,
	oracle: uuidOfLabel('o1'),
	verdict
});

describe('applyVerdicts', () => {
	it('сливает новые вердикты и сохраняет их', () => {
		const stored = [verdictOf('h1', 'negation')];
		const save = vi.fn();
		const merge = applyVerdicts({ readAll: () => stored, save }, [
			verdictOf('h9', 'independent'),
			verdictOf('h2', 'independent', 'другая строка')
		]);
		expect(merge).toEqual({ added: 1, total: 2 });
		expect(save.mock.calls[0]?.[0]).toEqual([
			verdictOf('h9', 'independent'),
			verdictOf('h2', 'independent', 'другая строка')
		]);
	});
});
