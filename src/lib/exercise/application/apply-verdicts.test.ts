import { describe, expect, it, vi } from 'vitest';

import type { Verdict } from '../domain/verdict.ts';

import { applyVerdicts } from './apply-verdicts.ts';

const verdictOf = (hash: string, verdict: string, line = 'строка'): Verdict =>
	({ hash, id: `id-${hash}`, line, oracle: 'o1', verdict }) as unknown as Verdict;

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
