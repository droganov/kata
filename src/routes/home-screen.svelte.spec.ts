import { fireEvent, render, screen, within } from '@testing-library/svelte';
import { createRawSnippet, flushSync } from 'svelte';
import { describe, expect, it, vi } from 'vitest';

import type { FakeBrowser } from '../test/install-browser.ts';

import {
	ANDROID_CHROME,
	fakeBrowser,
	installPromptEvent,
	IPHONE_SAFARI,
	withoutPromptHandler
} from '../test/install-browser.ts';
import HomeScreen from './home-screen.svelte';
import { createInstall } from './install.svelte.ts';

const MAC_FIREFOX =
	'Mozilla/5.0 (Macintosh; Intel Mac OS X 15.6; rv:143.0) Gecko/20100101 Firefox/143.0';
const MAC_SAFARI =
	'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Safari/605.1.15';
const MAC_CHROME =
	'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36';
const children = createRawSnippet(() => ({ render: () => '<h1>Вход</h1>' }));

const renderFor = (browser: FakeBrowser): void => {
	render(HomeScreen, { children, install: createInstall(browser) });
};
const iphone = (): FakeBrowser => withoutPromptHandler(fakeBrowser(IPHONE_SAFARI));
const continueInBrowser = (): Promise<boolean> =>
	fireEvent.click(screen.getByRole('button', { name: 'Продолжить в браузере' }));

describe('домашний экран, где поставить можно', () => {
	it('идёт первым: Вход не показан, пока человек не выбрал', () => {
		renderFor(fakeBrowser(ANDROID_CHROME));
		expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Kato.one');
		expect(screen.queryByRole('heading', { name: 'Вход' })).not.toBeInTheDocument();
	});

	it('на Chromium кнопка установки оживает только по beforeinstallprompt', async () => {
		const browser = fakeBrowser(MAC_CHROME);
		renderFor(browser);
		expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(
			'Поставьте Kato.one на компьютер'
		);
		expect(screen.getByRole('button', { name: 'Готовим установку…' })).toBeDisabled();
		const event = installPromptEvent('accepted');
		browser.fire(event);
		flushSync();
		await fireEvent.click(screen.getByRole('button', { name: 'Установить Kato.one' }));
		expect(event.prompted).toBe(true);
		expect(await screen.findByRole('heading', { name: 'Вход' })).toBeInTheDocument();
	});

	it('на iPhone показывает шаги списком, значок «Поделиться» стоит в тексте шага, а не кнопкой', () => {
		renderFor(iphone());
		expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(
			'Поставьте Kato.one на экран «Домой»'
		);
		const steps = screen.getByRole('list', { name: 'Как поставить' });
		expect(within(steps).getAllByRole('listitem').length).toBeGreaterThan(1);
		expect(within(steps).queryByRole('button')).not.toBeInTheDocument();
		const icon = within(steps).getByRole('img', { name: 'значок «Поделиться»' });
		expect(icon.closest('li')).toHaveTextContent('Нажмите «Поделиться»');
		expect(within(steps).getAllByRole('img', { name: 'значок «три точки»' })).toHaveLength(2);
		expect(
			within(steps).getByRole('img', { name: 'значок «На экран «Домой»»' }).closest('li')
		).toHaveTextContent('Нажмите «На экран «Домой»»');
		expect(screen.getByText('Нажмите три точки меню «Ещё»')).toBeInTheDocument();
	});

	it('на iPhone прямо говорит, что без установки локальные данные живут семь дней', () => {
		renderFor(iphone());
		expect(screen.getByRole('note')).toHaveTextContent('на iPhone без установки');
		expect(screen.getByRole('note')).toHaveTextContent('семь дней');
	});

	it('в Safari на Mac ведёт в Dock и тоже предупреждает о семи днях', () => {
		renderFor(withoutPromptHandler(fakeBrowser(MAC_SAFARI)));
		expect(screen.getByText('Выберите «Добавить в Dock»')).toBeInTheDocument();
		expect(screen.getByRole('note')).toHaveTextContent('Safari стирает данные сайтов');
	});

	it('вне Safari о семи днях не говорит', () => {
		renderFor(fakeBrowser(ANDROID_CHROME));
		expect(screen.queryByRole('note')).toBeNull();
	});
});

describe('домашний экран, где поставить нельзя', () => {
	it('не зовёт ставить, а объясняет и даёт скопировать адрес', async () => {
		const writeText = vi.spyOn(navigator.clipboard, 'writeText');
		renderFor(withoutPromptHandler(fakeBrowser(MAC_FIREFOX)));
		expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(
			'В этом браузере поставить нельзя'
		);
		expect(screen.queryByText(/Поставьте Kato.one/)).toBeNull();
		expect(screen.getByText(/откройте его в Safari/)).toBeInTheDocument();
		await fireEvent.click(screen.getByRole('button', { name: 'Скопировать адрес' }));
		expect(writeText).toHaveBeenCalledWith(`${location.origin}/`);
		expect(await screen.findByRole('button', { name: 'Адрес скопирован' })).toBeInTheDocument();
	});

	it('после возврата в окно не знает, что в буфере, и снова предлагает скопировать', async () => {
		renderFor(withoutPromptHandler(fakeBrowser(MAC_FIREFOX)));
		await fireEvent.click(screen.getByRole('button', { name: 'Скопировать адрес' }));
		await screen.findByRole('button', { name: 'Адрес скопирован' });
		await fireEvent.focus(document.defaultView ?? document);
		expect(screen.getByRole('button', { name: 'Скопировать адрес' })).toBeInTheDocument();
	});
});

describe('отказ и установленное приложение', () => {
	it('«продолжить в браузере» пускает ко Входу до конца сессии', async () => {
		const browser = iphone();
		renderFor(browser);
		await continueInBrowser();
		expect(screen.getByRole('heading', { name: 'Вход' })).toBeInTheDocument();
		expect(browser.sessionStorage.getItem('training:install-refused')).not.toBeNull();
	});

	it('запущенному установленным экран не показывается', () => {
		const browser = fakeBrowser(ANDROID_CHROME);
		browser.setDisplayMode('standalone');
		renderFor(browser);
		expect(screen.getByRole('heading', { name: 'Вход' })).toBeInTheDocument();
	});
});
