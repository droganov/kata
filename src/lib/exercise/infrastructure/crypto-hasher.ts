import { createHash } from 'node:crypto';

import type { Hasher } from '../application/hasher.ts';

const CONTENT_HASH = 'sha1';
const INPUT_ENCODING = 'utf8';
const OUTPUT_ENCODING = 'hex';

export function createCryptoHasher(): Hasher {
	return createDigestHasher(CONTENT_HASH);
}

function createDigestHasher(algorithm: string): Hasher {
	return {
		digest: (text: string): string =>
			createHash(algorithm).update(text, INPUT_ENCODING).digest(OUTPUT_ENCODING)
	};
}
