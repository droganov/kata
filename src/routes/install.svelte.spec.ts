import { describe, expect, it } from 'vitest';

import {
	ANDROID_CHROME,
	fakeBrowser,
	installPromptEvent,
	IPHONE_SAFARI,
	withoutPromptHandler
} from '../test/install-browser.ts';
import { createInstall } from './install.svelte.ts';

describe('установка в браузере', () => {
	it('кнопки нет, пока не пришёл beforeinstallprompt', () => {
		const browser = fakeBrowser(ANDROID_CHROME);
		const install = createInstall(browser);
		expect(install.instruction).toEqual({ kind: 'prompt' });
		expect(install.canPrompt).toBe(false);
		expect(install.isShown).toBe(true);
		const event = installPromptEvent('dismissed');
		browser.fire(event);
		expect(event.defaultPrevented).toBe(true);
		expect(install.canPrompt).toBe(true);
	});

	it('событие без prompt не считается приглашением установить', () => {
		const browser = fakeBrowser(ANDROID_CHROME);
		const install = createInstall(browser);
		browser.fire(new Event('beforeinstallprompt'));
		expect(install.canPrompt).toBe(false);
	});

	it('отказ в системном диалоге тратит событие, экран остаётся', async () => {
		const browser = fakeBrowser(ANDROID_CHROME);
		const install = createInstall(browser);
		const event = installPromptEvent('dismissed');
		browser.fire(event);
		await install.prompt();
		expect(event.prompted).toBe(true);
		expect(install.canPrompt).toBe(false);
		expect(install.isShown).toBe(true);
		await install.prompt();
	});

	it('принятая установка и appinstalled убирают экран', async () => {
		const accepted = fakeBrowser(ANDROID_CHROME);
		const install = createInstall(accepted);
		accepted.fire(installPromptEvent('accepted'));
		await install.prompt();
		expect(install.isShown).toBe(false);
		const elsewhere = fakeBrowser(ANDROID_CHROME);
		const other = createInstall(elsewhere);
		elsewhere.fire(installPromptEvent('dismissed'));
		elsewhere.fire(new Event('appinstalled'));
		expect(other.canPrompt).toBe(false);
		expect(other.isShown).toBe(false);
	});

	it('без onbeforeinstallprompt кнопку не обещает, но экран показывает', () => {
		const install = createInstall(withoutPromptHandler(fakeBrowser(ANDROID_CHROME)));
		expect(install.instruction.kind).toBe('unsupported');
		expect(install.isShown).toBe(true);
	});
});

describe('отказ от установки', () => {
	it('держится до конца сессии браузера', () => {
		const browser = withoutPromptHandler(fakeBrowser(IPHONE_SAFARI));
		const install = createInstall(browser);
		install.refuse();
		expect(install.isShown).toBe(false);
		expect(createInstall(browser).isShown).toBe(false);
	});

	it('новая сессия снова показывает экран', () => {
		const browser = fakeBrowser(ANDROID_CHROME);
		createInstall(browser).refuse();
		browser.sessionStorage.clear();
		expect(createInstall(browser).isShown).toBe(true);
	});

	it('без доступа к sessionStorage помнит отказ до перезагрузки', () => {
		const browser = Object.defineProperty(fakeBrowser(ANDROID_CHROME), 'sessionStorage', {
			get: () => {
				throw new DOMException('blocked', 'SecurityError');
			}
		});
		const install = createInstall(browser);
		expect(install.isShown).toBe(true);
		install.refuse();
		expect(install.isShown).toBe(false);
	});
});

describe('раньше бандла', () => {
	it('подхватывает beforeinstallprompt, пойманный скриптом в app.html', () => {
		const event = installPromptEvent('dismissed');
		const browser = Object.assign(fakeBrowser(ANDROID_CHROME), {
			deferredInstallPrompt: event
		});
		expect(createInstall(browser).canPrompt).toBe(true);
		const stray = Object.assign(fakeBrowser(ANDROID_CHROME), {
			deferredInstallPrompt: 'prompt'
		});
		expect(createInstall(stray).canPrompt).toBe(false);
	});
});

describe('запуск установленным', () => {
	it('установленному экран не показывает', () => {
		const browser = fakeBrowser(ANDROID_CHROME);
		browser.setDisplayMode('standalone');
		expect(createInstall(browser).isShown).toBe(false);
	});

	it('перенос вкладки в окно приложения убирает экран на ходу', () => {
		const browser = fakeBrowser(ANDROID_CHROME);
		const install = createInstall(browser);
		expect(install.isShown).toBe(true);
		browser.setDisplayMode('standalone');
		expect(install.isShown).toBe(false);
	});

	it('на iOS верит navigator.standalone', () => {
		const navigator = {
			language: 'ru-RU',
			maxTouchPoints: 5,
			platform: 'iPhone',
			standalone: true,
			userAgent: IPHONE_SAFARI
		};
		expect(createInstall(fakeBrowser(IPHONE_SAFARI, { navigator })).isShown).toBe(false);
	});
});
