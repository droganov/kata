export interface Session {
	readonly items: readonly SessionItem[];
	readonly program: string;
}

export interface SessionItem {
	readonly block: string;
	readonly dose: string;
	readonly exercise: string;
	readonly ord: number;
	readonly target: string;
}
