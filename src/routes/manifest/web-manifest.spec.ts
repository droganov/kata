import { describe, expect, it } from 'vitest';

import { webManifestOf } from './web-manifest.ts';

describe('манифест', () => {
	const manifest = webManifestOf('https://training.example');

	it('несёт ровно восемь полей помимо иконок', () => {
		expect(Object.keys(manifest).toSorted((left, right) => left.localeCompare(right))).toEqual([
			'background_color',
			'display',
			'icons',
			'id',
			'name',
			'scope',
			'short_name',
			'start_url',
			'theme_color'
		]);
	});

	it('берёт домен из переданного адреса, а не из кода', () => {
		expect(manifest.id).toBe('https://training.example/?source=pwa');
		expect(manifest.start_url).toBe('https://training.example/?source=pwa');
		expect(manifest.scope).toBe('https://training.example/');
		expect(webManifestOf('https://training.deno.dev').scope).toBe('https://training.deno.dev/');
	});

	it('объявляет standalone, иначе Chromium не считает приложение устанавливаемым', () => {
		expect(manifest.display).toBe('standalone');
	});

	it('несёт иконки 192 и 512 без purpose, чтобы iOS их увидел', () => {
		const plain = manifest.icons.filter((icon) => icon.purpose === undefined);
		expect(plain.map((icon) => icon.sizes)).toEqual(['192x192', '512x512']);
	});

	it('объявляет maskable дополнительной записью, а не единственным purpose', () => {
		const maskable = manifest.icons.filter((icon) => icon.purpose === 'maskable');
		expect(maskable).toHaveLength(1);
		expect(maskable[0]!.sizes).toBe('512x512');
		expect(manifest.icons.length).toBeGreaterThan(maskable.length);
	});

	it('все иконки объявлены как png', () => {
		expect(manifest.icons.every((icon) => icon.type === 'image/png')).toBe(true);
	});
});
