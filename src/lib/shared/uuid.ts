const UUID_V7 = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const HEX = 16;
const BYTE_WIDTH = 2;
const TIME_WIDTH = 12;
const TIME_HIGH_WIDTH = 8;
const RANDOM_WIDTH = 20;
const VERSION_GROUP_END = 4;
const VARIANT_GROUP_END = 8;
const VARIANT_MASK = 0x3;
const VARIANT_BITS = 0x8;
const VERSION = '7';
const NIBBLE_WIDTH = 1;
const ZERO = '0';
const SEPARATOR = '-';

export type Uuid = string & { readonly brand: unique symbol };

export const isUuid = (value: string): value is Uuid => UUID_V7.test(value);

export const uuidOf = (value: string): Uuid => {
	if (!isUuid(value)) throw new TypeError(`${value} is not a UUIDv7`);
	return value;
};

export const uuidV7Of = (time: number, random: Uint8Array): Uuid => {
	const moment = time.toString(HEX).padStart(TIME_WIDTH, ZERO);
	const noise = hexOf(random).padEnd(RANDOM_WIDTH, ZERO);
	const variantNibble = Number.parseInt(
		noise.slice(VERSION_GROUP_END, VERSION_GROUP_END + NIBBLE_WIDTH),
		HEX
	);
	const variant = ((variantNibble & VARIANT_MASK) | VARIANT_BITS).toString(HEX);
	return uuidOf(
		[
			moment.slice(0, TIME_HIGH_WIDTH),
			moment.slice(TIME_HIGH_WIDTH),
			VERSION + noise.slice(NIBBLE_WIDTH, VERSION_GROUP_END),
			variant + noise.slice(VERSION_GROUP_END + NIBBLE_WIDTH, VARIANT_GROUP_END),
			noise.slice(VARIANT_GROUP_END, RANDOM_WIDTH)
		].join(SEPARATOR)
	);
};

export const hexOf = (bytes: Uint8Array): string =>
	[...bytes].map((byte) => byte.toString(HEX).padStart(BYTE_WIDTH, ZERO)).join('');
