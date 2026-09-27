import type { Authenticator } from '../application/sign-in.ts';

import { hexOf } from '../../shared/uuid.ts';

const CREDENTIAL_ID_BYTES = 32;
const PUBLIC_KEY_BYTES = 65;
const INTERNAL_TRANSPORT = 'internal';

export const createStubAuthenticator = (
	randomBytes: (length: number) => Uint8Array
): Authenticator => ({
	confirmKey: ([key]) => Promise.resolve(key),
	createKey: () =>
		Promise.resolve({
			backedUp: true,
			credentialId: hexOf(randomBytes(CREDENTIAL_ID_BYTES)),
			publicKey: hexOf(randomBytes(PUBLIC_KEY_BYTES)),
			signCount: 0,
			transports: [INTERNAL_TRANSPORT]
		})
});
