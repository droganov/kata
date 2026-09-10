const PER_SIDE = '/сторона';
const EACH_LEG = 'каждая нога';
const TIMES = '×';
const EN_DASH = '–';
const HYPHEN = '-';
const NUMBER = /\d+(?:[.,]\d+)?/g;
const SECONDS = /\d\s*с(?![а-яё])|(?<![а-яё])с(?![а-яё])|сек/;
const MINUTES = 'мин';
const LEGACY_HOLD = /^\d+с$/;
const MINUTE_FRACTION_TO_SECONDS = 6;
const DECIMAL_SEPARATOR = /[.,]/;
export const DOSE_UNIT = { minutes: 'minutes', reps: 'reps', seconds: 'seconds' } as const;

export interface Dose {
	readonly isPerSide: boolean;
	readonly numbers: readonly string[];
	readonly text: string;
	readonly unit: DoseUnit;
}

type DoseUnit = (typeof DOSE_UNIT)[keyof typeof DOSE_UNIT];

const unitOf = (text: string): DoseUnit => {
	if (text.includes(MINUTES)) return DOSE_UNIT.minutes;
	return SECONDS.test(text) ? DOSE_UNIT.seconds : DOSE_UNIT.reps;
};

const expandDecimal = (token: string): string[] => {
	if (!DECIMAL_SEPARATOR.test(token)) return [token];
	const [whole, fraction] = token.split(DECIMAL_SEPARATOR);
	return [String(whole), String(Number(fraction) * MINUTE_FRACTION_TO_SECONDS)];
};

const countedParts = (text: string): string[] => {
	const parts = text.split(TIMES);
	if (parts.length === 1) return parts;
	const isLegacyHold = parts.some((part, index) => index === 0 && LEGACY_HOLD.test(part.trim()));
	return isLegacyHold ? parts : parts.slice(1);
};

export function parseDose(text: string): Dose {
	const normalized = text.split(EN_DASH).join(HYPHEN);
	const numbers = countedParts(normalized).flatMap((part) =>
		part
			.matchAll(NUMBER)
			.flatMap((match) => expandDecimal(match[0]))
			.toArray()
	);
	return {
		isPerSide: text.includes(PER_SIDE) || text.includes(EACH_LEG),
		numbers: [...new Set(numbers)],
		text,
		unit: unitOf(normalized)
	};
}
