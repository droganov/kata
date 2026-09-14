export const memoryStorage = (): Storage => {
	const items = new Map<string, string>();
	return {
		clear: () => {
			items.clear();
		},
		getItem: (key) => items.get(key) ?? null,
		key: (index) => items.keys().toArray()[index] ?? null,
		get length() {
			return items.size;
		},
		removeItem: (key) => {
			items.delete(key);
		},
		setItem: (key, value) => {
			items.set(key, value);
		}
	};
};
