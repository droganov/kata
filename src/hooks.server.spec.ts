import { expect, it, vi } from 'vitest';

import { handle } from './hooks.server.ts';
import { builtWorker } from './routes/built-worker.ts';

vi.mock(import('./routes/built-worker.ts'), async (original) => ({
	...(await original()),
	builtWorker: vi.fn(() => Promise.resolve(new Response('воркер')))
}));

const eventAt = (pathname: string): { readonly url: URL } => ({
	url: new URL(pathname, 'https://training.example')
});

it('по адресу сервис-воркера отдаёт собранный воркер, остальное пропускает к роутам', async () => {
	const resolve = vi.fn(() => new Response('роут'));
	const worker = await handle({ event: eventAt('/service-worker.js'), resolve });
	expect(await worker.text()).toBe('воркер');
	expect(builtWorker).toHaveBeenCalledOnce();
	const page = await handle({ event: eventAt('/marks'), resolve });
	expect(await page.text()).toBe('роут');
	expect(resolve).toHaveBeenCalledOnce();
});
