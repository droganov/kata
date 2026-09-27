const PLATFORMS: readonly (readonly [RegExp, string])[] = [
	[/iPhone/, 'iPhone'],
	[/iPad/, 'iPad'],
	[/Android/, 'Android'],
	[/Mac OS X/, 'Mac'],
	[/Windows/, 'Windows'],
	[/Linux/, 'Linux']
];
const BROWSERS: readonly (readonly [RegExp, string])[] = [
	[/Edg\//, 'Edge'],
	[/Firefox\/|FxiOS\//, 'Firefox'],
	[/Chrome\/|CriOS\//, 'Chrome'],
	[/Safari\//, 'Safari']
];
const UNKNOWN_DEVICE = 'Неизвестное устройство';
const SEPARATOR = ' · ';

export const deviceLabelOf = (userAgent: string): string => {
	const parts = [PLATFORMS, BROWSERS]
		.map((known) => known.find(([pattern]) => pattern.test(userAgent))?.[1])
		.filter((part) => part !== undefined);
	return parts.length === 0 ? UNKNOWN_DEVICE : parts.join(SEPARATOR);
};
