export const withRawField = <T>(value: T, field: string, raw: unknown): T => ({
	...value,
	[field]: raw
});
