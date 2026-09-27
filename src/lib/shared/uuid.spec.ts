import { describe, expect, it } from 'vitest';

import { isUuid, uuidOf, uuidV7Of } from './uuid';

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

describe('новый uuid v7', () => {
	it('кладёт время в первые 48 бит, версию и вариант поверх случайных байтов', () => {
		const random = new Uint8Array(10).fill(0xff);
		const made = uuidV7Of(Date.parse('2026-09-27T00:00:00.000Z'), random);
		expect(made).toBe('01a0e029-5400-7fff-bfff-ffffffffffff');
		expect(isUuid(made)).toBe(true);
	});

	it('с нулевыми случайными байтами остаётся версией 7', () => {
		expect(uuidV7Of(0, new Uint8Array(10))).toBe('00000000-0000-7000-8000-000000000000');
	});
});
