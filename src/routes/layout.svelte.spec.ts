import { fireEvent, render, screen } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import { afterEach, expect, it, vi } from 'vitest';

import type * as InstallModule from './install.svelte.ts';

import Layout from './+layout.svelte';

const HEADING = '<h1>Вход</h1>';

const browser = vi.hoisted(() => ({ isInstalled: true }));

vi.mock('./install.svelte.ts', async (importOriginal) => {
	const original = await importOriginal<typeof InstallModule>();
	const { ANDROID_CHROME: androidChrome, fakeBrowser } =
		await import('../test/install-browser.ts');
	return {
		...original,
		get browserInstall() {
			const fake = fakeBrowser(androidChrome);
			if (browser.isInstalled) fake.setDisplayMode('standalone');
			return original.createInstall(fake);
		}
	};
});

const children = createRawSnippet(() => ({ render: () => HEADING }));

afterEach(() => {
	browser.isInstalled = true;
});

it('раскладка рендерит детей', () => {
	render(Layout, { children, data: { hasExpiredSession: false } });
	expect(screen.getByRole('heading', { level: 1 })).toBeVisible();
	expect(screen.queryByRole('status')).not.toBeInTheDocument();
});

it('сообщает, что Занятие закрылось само', () => {
	render(Layout, { children, data: { hasExpiredSession: true } });
	expect(screen.getByRole('status')).toHaveTextContent('Занятие закрылось само');
});

it('Вход идёт после домашнего экрана, а не до него', async () => {
	browser.isInstalled = false;
	render(Layout, { children, data: { hasExpiredSession: false } });
	expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Kato.one');
	expect(screen.queryByRole('heading', { name: 'Вход' })).not.toBeInTheDocument();
	await fireEvent.click(screen.getByRole('button', { name: 'Продолжить в браузере' }));
	expect(screen.getByRole('heading', { name: 'Вход' })).toBeInTheDocument();
});

it('новая версия приложения взяла управление: страница перезагружается на неё', () => {
	const listeners = new Map<string, () => void>();
	const container = {
		addEventListener: (type: string, listener: () => void) => {
			listeners.set(type, listener);
		},
		controller: {},
		getRegistration: () => Promise.resolve(undefined)
	};
	const reload = vi.spyOn(location, 'reload').mockReturnValue();
	Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value: container });
	render(Layout, { children, data: { hasExpiredSession: false } });
	listeners.get('controllerchange')?.();
	expect(reload).toHaveBeenCalledOnce();
	Reflect.deleteProperty(navigator, 'serviceWorker');
});
