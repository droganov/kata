const CODE_LIFETIME_MS = 600_000;

export interface EmailCode {
	readonly account: string;
	readonly codeHash: string;
	readonly expiresAt: string;
	readonly id: string;
	readonly usedAt: null | string;
}

export const expiryOf = (issuedAt: Date): string =>
	new Date(issuedAt.getTime() + CODE_LIFETIME_MS).toISOString();

export const isCodeUsable = (code: EmailCode, now: Date): boolean =>
	code.usedAt === null && Date.parse(code.expiresAt) > now.getTime();
