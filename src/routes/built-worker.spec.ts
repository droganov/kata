import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { builtWorker } from './built-worker.ts';

const deployedIn = (worker?: string): string => {
	const root = mkdtempSync(path.join(tmpdir(), 'training-deploy-'));
	if (worker !== undefined) {
		mkdirSync(path.join(root, '.deno-deploy/static'), { recursive: true });
		writeFileSync(path.join(root, '.deno-deploy/static/service-worker.js'), worker);
	}
	return root;
};

describe('builtWorker', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('отдаёт собранный сервис-воркер: адаптер Deno отдаёт только статику и immutable', async () => {
		vi.spyOn(process, 'cwd').mockReturnValue(deployedIn('self.addEventListener("fetch", f);'));
		const response = await builtWorker();
		expect(response.headers.get('content-type')).toBe('text/javascript; charset=utf-8');
		expect(response.headers.get('cache-control')).toBe('no-cache');
		expect(await response.text()).toBe('self.addEventListener("fetch", f);');
	});

	it('без сборки отвечает 404', async () => {
		vi.spyOn(process, 'cwd').mockReturnValue(deployedIn());
		const response = await builtWorker();
		expect(response.status).toBe(404);
	});
});
