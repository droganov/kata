export interface Credential extends NewCredential {
	readonly account: string;
	readonly createdAt: string;
	readonly id: string;
	readonly lastUsedAt: null | string;
}

export interface NewCredential {
	readonly backedUp: boolean;
	readonly credentialId: string;
	readonly publicKey: string;
	readonly signCount: number;
	readonly transports: readonly string[];
}
