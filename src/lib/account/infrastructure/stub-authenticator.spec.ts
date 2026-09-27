import { describe, expect, it } from 'vitest';

import { createStubAuthenticator } from './stub-authenticator.ts';

const PERSON = {
	createdAt: '2026-09-27T08:00:00.000Z',
	email: 'sergei@example.com',
	emailVerifiedAt: null,
	handle: 'ab'.repeat(64),
	id: '01a0e029-5400-7000-8000-000000000000',
	nickname: 'Sergei'
};

describe('заглушка ключа', () => {
	it('создаёт ключ формы настоящего passkey, не вызывая WebAuthn', async () => {
		const authenticator = createStubAuthenticator((length) => new Uint8Array(length).fill(1));
		expect(await authenticator.createKey(PERSON)).toEqual({
			backedUp: true,
			credentialId: '01'.repeat(32),
			publicKey: '01'.repeat(65),
			signCount: 0,
			transports: ['internal']
		});
	});

	it('подтверждает ключом Аккаунта, не вызывая WebAuthn', async () => {
		const authenticator = createStubAuthenticator((length) => new Uint8Array(length));
		const key = {
			account: PERSON.id,
			backedUp: true,
			createdAt: PERSON.createdAt,
			credentialId: 'c0ffee',
			id: '01a0e029-5400-7000-8000-000000000001',
			lastUsedAt: null,
			publicKey: 'beef',
			signCount: 0,
			transports: ['internal']
		};
		expect(await authenticator.confirmKey([key])).toEqual(key);
		expect(await authenticator.confirmKey([])).toBeUndefined();
	});
});
