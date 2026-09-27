import { describe, expect, it } from 'vitest';

import type { DeviceAccount } from './device-account.ts';

import { lastSignedInFirst } from './device-account.ts';

const knownAt = (account: string, signedInAt: string): DeviceAccount => ({
	account,
	key: `key-${account}`,
	nickname: account,
	signedInAt
});

describe('Аккаунты устройства', () => {
	it('ставят последний вход первым', () => {
		const earlier = knownAt('anna', '2026-09-27T08:00:00.000Z');
		const later = knownAt('sergei', '2026-09-27T09:00:00.000Z');
		expect(lastSignedInFirst([earlier, later])).toEqual([later, earlier]);
	});
});
