const LINE_BREAK = '\n';

export async function loadJsonl<T>(fetchFn: typeof fetch, path: string): Promise<T[]> {
	const res = await fetchFn(path);
	if (!res.ok) throw new Error(`${path}: ${String(res.status)}`);
	const text = await res.text();
	return text
		.split(LINE_BREAK)
		.filter((line) => line.trim())
		.map((line) => JSON.parse(line) as T);
}
