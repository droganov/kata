import { expect, it, vi } from 'vitest';

import { serveOffline } from './routes/offline-shell.ts';

vi.mock('$service-worker', () => ({
	build: ['/_app/immutable/start.js'],
	files: ['/favicon.svg'],
	version: '42'
}));
vi.mock(import('./routes/offline-shell.ts'), () => ({ serveOffline: vi.fn() }));

it('сервис-воркер держит оболочку: сборку и статику своей версии', async () => {
	await import('./service-worker.ts');
	expect(serveOffline).toHaveBeenCalledWith(globalThis, {
		assets: ['/_app/immutable/start.js', '/favicon.svg'],
		version: '42'
	});
});
