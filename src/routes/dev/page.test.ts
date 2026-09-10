import { describe, expect, it, vi } from 'vitest';

import { load } from './+page';

type LoadArg = Parameters<typeof load>[0];
const run = (fetch: typeof globalThis.fetch): ReturnType<typeof load> =>
	load({ fetch } as unknown as LoadArg);

const bodies: Record<string, string> = {
	'/data/calisthenics.json': '{"zones":[],"excluded":[]}',
	'/data/days.jsonl': '{"id":"w1d1","index":1,"title":"День 1","minutes":1,"axes":[]}',
	'/data/equipment.jsonl': '{"id":"body","name":"Тело"}',
	'/data/exercises.jsonl': '',
	'/data/prompts.json': '{"plan:x":"P"}',
	'/data/strength.json': '{"zones":[],"excluded":[]}',
	'/data/stretch.json': '{"zones":[],"excluded":[]}',
	'/data/targets.jsonl': '{"id":"t","name":"Т"}'
};

const fetchOf = (missing: string[]): typeof fetch =>
	vi.fn((url: string) =>
		Promise.resolve(
			missing.includes(url)
				? new Response('', { status: 404 })
				: new Response(bodies[url] ?? '', { status: 200 })
		)
	) as unknown as typeof fetch;

describe('load /dev', () => {
	it('собирает дни, упражнения, справочники, промпты и банки', async () => {
		const data = await run(fetchOf([]));
		expect(data.days).toHaveLength(1);
		expect(data.equipment[0]?.name).toBe('Тело');
		expect(data.prompts['plan:x']).toBe('P');
		expect(data.banks.static).toEqual({ excluded: [], zones: [] });
	});
	it('без промптов и банка — пустой словарь и null', async () => {
		const data = await load({
			fetch: fetchOf(['/data/prompts.json', '/data/stretch.json'])
		} as unknown as LoadArg);
		expect(data.prompts).toEqual({});
		expect(data.banks.stretch).toBeNull();
	});
});
