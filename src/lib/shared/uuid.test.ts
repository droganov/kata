import { describe, expect, it } from 'vitest';

import { isUuid, uuidOf } from './uuid';

const VALID = '019927a0-5b3c-7f31-8d2e-0123456789ab';

describe('uuid v7', () => {
	it('принимает только версию 7 с вариантом 8..b в нижнем регистре', () => {
		expect(isUuid(VALID)).toBe(true);
		expect(isUuid(VALID.toUpperCase())).toBe(false);
		expect(isUuid('019927a0-5b3c-4f31-8d2e-0123456789ab')).toBe(false);
		expect(isUuid('wall_sit')).toBe(false);
	});
	it('uuidOf возвращает значение или бросает', () => {
		expect(uuidOf(VALID)).toBe(VALID);
		expect(() => uuidOf('x')).toThrow('x is not a UUIDv7');
	});
});
