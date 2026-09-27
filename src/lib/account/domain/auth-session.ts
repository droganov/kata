export interface AuthSession {
	readonly account: string;
	readonly createdAt: string;
	readonly deviceLabel: string;
	readonly id: string;
	readonly key: string;
	readonly lastSeenAt: string;
}
