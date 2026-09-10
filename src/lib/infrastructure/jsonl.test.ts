import { describe, expect, it, vi } from 'vitest';

import { loadJsonl } from './jsonl';

const fetchWith = (status: number, body: string): typeof fetch =>
	vi.fn(() => Promise.resolve(new Response(body, { status })));

describe('loadJsonl', () => {
	it('парсит строки, пропуская пустые', async () => {
		const rows = await loadJsonl<{ id: number }>(
			fetchWith(200, '{"id":1}\n\n{"id":2}\n'),
			'/data/x.jsonl'
		);
		expect(rows).toEqual([{ id: 1 }, { id: 2 }]);
	});
	it('бросает ошибку с путём и статусом', async () => {
		await expect(loadJsonl(fetchWith(404, ''), '/data/x.jsonl')).rejects.toThrow(
			'/data/x.jsonl: 404'
		);
	});
});
