export type JsonObject = Record<string, unknown>;

const OBJECT_TYPE = 'object';

const isJsonObject = (value: unknown): value is JsonObject =>
	typeof value === OBJECT_TYPE && value !== null && !Array.isArray(value);

export const jsonObjectOf = (text: string): JsonObject => {
	const parsed: unknown = JSON.parse(text);
	if (!isJsonObject(parsed)) throw new TypeError(`Ожидается объект JSON: ${text.slice(0, 40)}`);
	return parsed;
};
