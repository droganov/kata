import { describe, expect, it } from 'vitest';

import { cryptoSeed } from './crypto-seed.ts';

describe('cryptoSeed', () => {
	it('даёт случайное целое зерно в пределах 32 бит', () => {
		const seeds = Array.from({ length: 20 }, () => cryptoSeed());
		for (const seed of seeds) {
			expect(Number.isSafeInteger(seed)).toBe(true);
			expect(seed).toBeGreaterThanOrEqual(0);
			expect(seed).toBeLessThan(2 ** 32);
		}
		expect(new Set(seeds).size).toBeGreaterThan(1);
	});
});
