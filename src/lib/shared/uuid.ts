const UUID_V7 = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

export type Uuid = string & { readonly brand: unique symbol };

export const isUuid = (value: string): value is Uuid => UUID_V7.test(value);

export const uuidOf = (value: string): Uuid => {
	if (!isUuid(value)) throw new TypeError(`${value} is not a UUIDv7`);
	return value;
};
