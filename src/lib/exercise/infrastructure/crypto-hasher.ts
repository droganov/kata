import { createHash } from 'node:crypto';

import type { Hasher } from '../application/hasher.ts';

const CONTENT_HASH = 'sha1';
const INPUT_ENCODING = 'utf8';
const OUTPUT_ENCODING = 'hex';

export const createCryptoHasher = (): Hasher => createDigestHasher(CONTENT_HASH);

const createDigestHasher = (algorithm: string): Hasher => ({
	digest: (text: string): string =>
		createHash(algorithm).update(text, INPUT_ENCODING).digest(OUTPUT_ENCODING)
});
