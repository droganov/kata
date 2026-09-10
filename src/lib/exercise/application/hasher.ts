export interface Hasher {
	digest: (text: string) => string;
}
