import { describe, expect, it } from 'vitest';

import { createCryptoHasher } from './crypto-hasher.ts';

describe('createCryptoHasher', () => {
	it('даёт sha1 в шестнадцатеричном виде', () => {
		expect(createCryptoHasher().digest('abc')).toBe('a9993e364706816aba3e25717850c26c9cd0d89d');
	});
});
