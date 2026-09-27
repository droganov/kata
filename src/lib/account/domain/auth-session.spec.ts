import { describe, expect, it } from 'vitest';

import type { AuthSession } from './auth-session.ts';

import { isLive, newestFirst } from './auth-session.ts';

const sessionAt = (
	id: string,
	createdAt: string,
	revokedAt: null | string = null
): AuthSession => ({
	account: 'person-a',
	createdAt,
	deviceLabel: 'iPhone · Safari',
	id,
	key: 'key-a',
	lastSeenAt: createdAt,
	revokedAt
});

describe('Сеанс', () => {
	it('жив, пока не погашен', () => {
		expect(isLive(sessionAt('a', '2026-09-27T08:00:00.000Z'))).toBe(true);
		expect(isLive(sessionAt('a', '2026-09-27T08:00:00.000Z', '2026-09-27T09:00:00.000Z'))).toBe(
			false
		);
	});

	it('Сеансы идут от нового к старому', () => {
		const older = sessionAt('older', '2026-09-26T08:00:00.000Z');
		const newer = sessionAt('newer', '2026-09-27T08:00:00.000Z');
		expect(newestFirst([older, newer]).map((session) => session.id)).toEqual([
			'newer',
			'older'
		]);
	});
});
