import { describe, expect, it } from 'vitest';

import type { Verdict } from './verdict.ts';

import { uuidOfLabel } from '../../../test/uuid.ts';
import { counterLineKey, independentHashesOf, mergeVerdicts, verdictHashText } from './verdict.ts';

const verdictOf = (
	hash: string,
	verdict: Verdict['verdict'],
	line: string,
	oracle: Verdict['oracle'] = uuidOfLabel('o1')
): Verdict => ({ hash, id: uuidOfLabel(`id-${hash}`), line, oracle, verdict });

describe('verdict', () => {
	it('берёт только хеши с вердиктом «независима»', () => {
		const verdicts = [verdictOf('h1', 'independent', 'а'), verdictOf('h2', 'negation', 'б')];
		expect([...independentHashesOf(verdicts)]).toEqual(['h1']);
	});

	it('сливает вердикты по паре оракул—строка, новый вытесняет старый', () => {
		const stored = [verdictOf('h1', 'negation', 'а'), verdictOf('h2', 'independent', 'б')];
		const incoming = [verdictOf('h9', 'independent', 'а'), verdictOf('h3', 'independent', 'в')];
		expect(
			mergeVerdicts(stored, incoming).map((verdict) => [verdict.hash, verdict.verdict])
		).toEqual([
			['h9', 'independent'],
			['h2', 'independent'],
			['h3', 'independent']
		]);
	});

	it('держит записи с одним хешем, но разными оракулами', () => {
		const stored = [
			verdictOf('h1', 'independent', 'а', uuidOfLabel('o1')),
			verdictOf('h1', 'independent', 'а', uuidOfLabel('o2'))
		];
		expect(mergeVerdicts(stored, [])).toHaveLength(2);
	});

	it('строит текст для хеша и ключ контр-строки', () => {
		expect(verdictHashText('П', ['м1', 'м2'], 'к')).toBe('П\nм1\nм2\nк');
		expect(counterLineKey('o1', 'к')).toBe('o1\nк');
	});
});
