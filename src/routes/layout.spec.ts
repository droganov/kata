import { existsSync, readFileSync } from 'node:fs';
import { expect, it } from 'vitest';

import { ssr } from './+layout.ts';

const APP_HTML = readFileSync('src/app.html', 'utf8');

it('приложение остаётся клиентским: серверный рендер выключен', () => {
	expect(ssr).toBe(false);
});

it('иконки объявлены в разметке до запуска скриптов, и Safari и прочим есть что взять', () => {
	expect(APP_HTML).toContain('<link rel="icon" href="/favicon.ico" sizes="32x32" />');
	expect(APP_HTML).toContain('<link rel="icon" href="/favicon.svg" type="image/svg+xml" />');
	expect([existsSync('static/favicon.ico'), existsSync('static/favicon.svg')]).toEqual([
		true,
		true
	]);
});
