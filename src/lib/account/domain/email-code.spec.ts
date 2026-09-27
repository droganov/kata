import { describe, expect, it } from 'vitest';

import type { EmailCode } from './email-code.ts';

import { expiryOf, isCodeUsable } from './email-code.ts';

const ISSUED_AT = new Date('2026-09-27T08:00:00.000Z');

const CODE: EmailCode = {
	account: 'person-a',
	codeHash: 'hash',
	expiresAt: expiryOf(ISSUED_AT),
	id: 'code-a',
	usedAt: null
};

describe('код подтверждения почты', () => {
	it('годен десять минут с выпуска', () => {
		expect(CODE.expiresAt).toBe('2026-09-27T08:10:00.000Z');
		expect(isCodeUsable(CODE, new Date('2026-09-27T08:09:59.999Z'))).toBe(true);
		expect(isCodeUsable(CODE, new Date('2026-09-27T08:10:00.000Z'))).toBe(false);
	});

	it('использованный код не годен', () => {
		expect(isCodeUsable({ ...CODE, usedAt: ISSUED_AT.toISOString() }, ISSUED_AT)).toBe(false);
	});
});
