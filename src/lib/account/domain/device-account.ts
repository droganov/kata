export interface DeviceAccount {
	readonly account: string;
	readonly key: string;
	readonly nickname: string;
	readonly signedInAt: string;
}

export const lastSignedInFirst = (accounts: readonly DeviceAccount[]): readonly DeviceAccount[] =>
	accounts.toSorted((first, second) => second.signedInAt.localeCompare(first.signedInAt));
