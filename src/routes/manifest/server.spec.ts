import type { RequestEvent } from '@sveltejs/kit';

import { afterEach, describe, expect, it, vi } from 'vitest';

import type { WebManifest } from './web-manifest.ts';

import { GET } from './+server.ts';

const eventOf = (href: string): RequestEvent => ({ url: new URL(href) }) as unknown as RequestEvent;

const manifestOf = async (href: string): Promise<WebManifest> => {
	const response = await GET(eventOf(href));
	return (await response.json()) as WebManifest;
};

describe('GET /manifest', () => {
	afterEach(() => {
		vi.unstubAllEnvs();
	});

	it('отдаётся под медиатипом манифеста, иначе браузер его не прочтёт', async () => {
		const response = await GET(eventOf('https://training.example/manifest'));
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
