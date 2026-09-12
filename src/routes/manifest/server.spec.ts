import { afterEach, describe, expect, it, vi } from 'vitest';

import type { JsonObject } from '../../test/json.ts';

import { jsonObjectOf } from '../../test/json.ts';
import { GET } from './+server.ts';

const manifestOf = async (href: string): Promise<JsonObject> => {
	const response = GET({ url: new URL(href) });
	return jsonObjectOf(await response.text());
};

describe('GET /manifest', () => {
	afterEach(() => {
		vi.unstubAllEnvs();
	});

	it('отдаётся под медиатипом манифеста, иначе браузер его не прочтёт', () => {
		const response = GET({ url: new URL('https://training.example/manifest') });
		expect(response.headers.get('content-type')).toBe('application/manifest+json');
	});

	it('отдаёт манифест приложения', async () => {
		const manifest = await manifestOf('https://training.example/manifest');
		expect(manifest.name).toBe('Training');
	});

	it('берёт домен из переменной окружения, а не из адреса запроса', async () => {
		vi.stubEnv('ORIGIN', 'https://training.deno.dev');
		const manifest = await manifestOf('http://localhost:5173/manifest');
		expect(manifest.scope).toBe('https://training.deno.dev/');
	});

	it('без переменной окружения берёт домен запроса', async () => {
		const manifest = await manifestOf('http://localhost:5173/manifest');
		expect(manifest.scope).toBe('http://localhost:5173/');
	});
});
