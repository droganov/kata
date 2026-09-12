import { createHash } from 'node:crypto';

import type { Uuid } from '../lib/shared/uuid.ts';

import { uuidOf } from '../lib/shared/uuid.ts';

const VERSION = '7';
const VARIANT_MASK = 0x3;
const VARIANT_BITS = 0x8;
const HEX = 16;

export const uuidOfLabel = (label: string): Uuid => {
	const hex = createHash('sha256').update(label).digest('hex');
	const variant = (
		(Number.parseInt(hex.slice(16, 17), HEX) & VARIANT_MASK) |
		VARIANT_BITS
	).toString(HEX);
	const node = hex.slice(20, 32);
	return uuidOf(
		`${hex.slice(0, 8)}-${hex.slice(8, 12)}-${VERSION}${hex.slice(13, 16)}-${variant}${hex.slice(17, 20)}-${node}`
	);
};
