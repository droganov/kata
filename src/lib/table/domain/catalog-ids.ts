export interface CatalogIds {
	readonly goalIdBySlug: ReadonlyMap<string, string>;
	readonly groupIdBySlug: ReadonlyMap<string, string>;
	readonly groupIdByTarget: ReadonlyMap<string, string>;
	readonly groupOrdById: ReadonlyMap<string, number>;
	readonly targetGroupIdBySlug: ReadonlyMap<string, string>;
	readonly targetIdByContourSlug: ReadonlyMap<string, string>;
	readonly targetIdByExercise: ReadonlyMap<string, string>;
}

export const idOf = <Value>(
	ids: ReadonlyMap<string, Value>,
	key: string,
	missing: string
): Value => {
	const id = ids.get(key);
	if (id === undefined) throw new TypeError(missing + key);
	return id;
};
