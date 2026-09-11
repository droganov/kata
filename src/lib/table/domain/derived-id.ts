const UNIT_SEPARATOR = '\u{1F}';
const UTF8 = new TextEncoder();
const FIRST_SEED = 0x81_1c_9d_c5;
const SECOND_SEED = 0x2f_6f_0b_41;
const THIRD_SEED = 0x5b_f1_3b_3d;
const FOURTH_SEED = 0x7d_2c_a7_f9;
const WORD_SEEDS: readonly number[] = [FIRST_SEED, SECOND_SEED, THIRD_SEED, FOURTH_SEED];
const WORD_PRIME = 0x01_00_01_93;
const WORD_LENGTH = 8;
const HEX_RADIX = 16;
const PAD = '0';
const VERSION_AT = 12;
const VERSION_MARK = '7';
const VARIANT_AT = 16;
const VARIANT_MARKS = '89ab';
const TIME_LENGTH = 8;
const MIDDLE_LENGTH = 4;
const NODE_LENGTH = 12;
const GROUP_LENGTHS: readonly number[] = [
	TIME_LENGTH,
	MIDDLE_LENGTH,
	MIDDLE_LENGTH,
	MIDDLE_LENGTH,
	NODE_LENGTH
];
const GROUP_SEPARATOR = '-';

export function derivedId(parts: readonly string[]): string {
	const text = parts.join(UNIT_SEPARATOR);
	const digits = WORD_SEEDS.map((seed) => hashedWord(text, seed)).join('');
	return grouped(Array.from(digits, (digit, at) => markedDigit(digit, at)).join(''));
}

function grouped(digits: string): string {
	const groups: string[] = [];
	let rest = digits;
	for (const length of GROUP_LENGTHS) {
		groups.push(rest.slice(0, length));
		rest = rest.slice(length);
	}
	return groups.join(GROUP_SEPARATOR);
}

function hashedWord(text: string, seed: number): string {
	let hash = seed;
	for (const byte of UTF8.encode(text)) hash = Math.imul(hash ^ byte, WORD_PRIME);
	return (hash >>> 0).toString(HEX_RADIX).padStart(WORD_LENGTH, PAD);
}

function markedDigit(digit: string, at: number): string {
	if (at === VERSION_AT) return VERSION_MARK;
	if (at === VARIANT_AT) return variantOf(digit);
	return digit;
}

function variantOf(digit: string): string {
	return VARIANT_MARKS.charAt(Number.parseInt(digit, HEX_RADIX) % VARIANT_MARKS.length);
}
