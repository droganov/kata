import { describe, expect, it } from 'vitest';

import type { Agent, InstallInstruction, Launch } from './install-promotion.ts';

import { memoryStorage } from '../test/memory-storage.ts';
import {
	installInstructionOf,
	installScreenOf,
	installStepsOf,
	isInstallRefused,
	isLaunchedInstalled,
	pageStorage,
	refuseInstall,
	unsupportedTextOf
} from './install-promotion.ts';

const RUSSIAN = 'ru-RU';
const iphone = (tail: string, os = '18_6'): Agent => ({
	language: RUSSIAN,
	maxTouchPoints: 5,
	platform: 'iPhone',
	userAgent: `Mozilla/5.0 (iPhone; CPU iPhone OS ${os} like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) ${tail}`
});
const IPHONE_SAFARI_18 = iphone('Version/18.6 Mobile/15E148 Safari/604.1');
const IPHONE_SAFARI_26 = iphone('Version/26.0 Mobile/15E148 Safari/604.1');
const IPHONE_SAFARI_27 = iphone('Version/27.0 Mobile/15E148 Safari/604.1');
const IPHONE_WEB_VIEW = iphone('Mobile/15E148');
const IPAD: Agent = {
	language: RUSSIAN,
	maxTouchPoints: 5,
	platform: 'MacIntel',
	userAgent:
		'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Safari/605.1.15'
};
const MAC_SAFARI: Agent = { ...IPAD, maxTouchPoints: 0 };
const MAC_CHROME: Agent = {
	...MAC_SAFARI,
	userAgent:
		'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36'
};
const MAC_FIREFOX: Agent = {
	...MAC_SAFARI,
	userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 15.6; rv:143.0) Gecko/20100101 Firefox/143.0'
};
const WINDOWS_FIREFOX: Agent = {
	language: RUSSIAN,
	maxTouchPoints: 0,
	platform: 'Win32',
	userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:143.0) Gecko/20100101 Firefox/143.0'
};
const LINUX_FIREFOX: Agent = {
	language: RUSSIAN,
	maxTouchPoints: 0,
	platform: 'Linux x86_64',
	userAgent: 'Mozilla/5.0 (X11; Linux x86_64; rv:143.0) Gecko/20100101 Firefox/143.0'
};
const ANDROID_CHROME: Agent = {
	language: RUSSIAN,
	maxTouchPoints: 5,
	platform: 'Linux armv8l',
	userAgent:
		'Mozilla/5.0 (Linux; Android 16) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Mobile Safari/537.36'
};
const ANDROID_EDGE: Agent = {
	...ANDROID_CHROME,
	userAgent: `${ANDROID_CHROME.userAgent} EdgA/153.0.0.0`
};
const ANDROID_FIREFOX: Agent = {
	...ANDROID_CHROME,
	userAgent: 'Mozilla/5.0 (Android 16; Mobile; rv:143.0) Gecko/143.0 Firefox/143.0'
};

const texts = (instruction: InstallInstruction): readonly string[] =>
	installStepsOf(instruction).map((step) => step.text);
const instructionOf = (agent: Agent): readonly string[] =>
	texts(installInstructionOf(agent, false));
const unsupportedOf = (agent: Agent): string | undefined =>
	unsupportedTextOf(installInstructionOf(agent, false));

const isBrowserMode = (): boolean => false;
const displayModeIs =
	(expected: string) =>
	(mode: string): boolean =>
		mode === expected;

const launchOf = (agent: Agent, overrides: Partial<Launch> = {}): Launch => ({
	agent,
	matchesDisplayMode: isBrowserMode,
	referrer: '',
	...overrides
});

describe('как поставить приложение', () => {
	it('где браузер умеет beforeinstallprompt, ставит кнопкой', () => {
		expect(installInstructionOf(ANDROID_CHROME, true)).toEqual({ kind: 'prompt' });
		expect(installInstructionOf(MAC_CHROME, true)).toEqual({ kind: 'prompt' });
		expect(installStepsOf(installInstructionOf(MAC_CHROME, true))).toEqual([]);
		expect(unsupportedTextOf(installInstructionOf(MAC_CHROME, true))).toBeUndefined();
	});

	it('Safari на macOS ставит в Dock, подписи на языке браузера', () => {
		expect(instructionOf(MAC_SAFARI)).toEqual([
			'Нажмите «Поделиться» справа на панели инструментов Safari',
			'Выберите «Добавить в Dock»',
			'Нажмите «Добавить»: приложение появится в Dock'
		]);
		expect(instructionOf({ ...MAC_SAFARI, language: 'en-US' })).toEqual([
			'Нажмите «Share» справа на панели инструментов Safari',
			'Выберите «Add to Dock»',
			'Нажмите «Add»: приложение появится в Dock'
		]);
	});

	it('Firefox на Windows ставит кнопкой в адресной строке', () => {
		expect(instructionOf(WINDOWS_FIREFOX)[0]).toBe(
			'Нажмите в адресной строке кнопку «Добавить вкладку на панель задач»'
		);
	});

	it('Firefox на Mac и Linux не ставит и отправляет в браузер, который ставит', () => {
		expect(unsupportedOf(MAC_FIREFOX)).toContain('откройте его в Safari');
		expect(unsupportedOf(LINUX_FIREFOX)).toContain('откройте его в Chrome или Edge');
		expect(unsupportedOf(MAC_CHROME)).toContain('откройте его в Chrome или Edge');
		expect(unsupportedOf(IPHONE_WEB_VIEW)).toContain('откройте его в Safari');
		expect(unsupportedOf(MAC_SAFARI)).toBeUndefined();
	});

	it('Safari на iOS до 26 ведёт через «Поделиться» с изображением кнопки', () => {
		const instruction = installInstructionOf(IPHONE_SAFARI_18, false);
		expect(texts(instruction)).toEqual([
			'Нажмите «Поделиться»',
			'Пролистайте вверх и нажмите «На экран «Домой»»'
		]);
		expect(installStepsOf(instruction)[0]?.icon).toBe('share');
		expect(installStepsOf(instruction)[1]?.icon).toBeUndefined();
	});

	it('Safari 26 и 27 прячет «Поделиться» за разные меню', () => {
		expect(instructionOf(IPHONE_SAFARI_26)).toEqual([
			'Нажмите три точки в правом нижнем углу',
			'Нажмите «Поделиться»',
			'Нажмите три точки меню «Ещё»',
			'Нажмите «На экран «Домой»»'
		]);
		expect(instructionOf(IPHONE_SAFARI_27)[0]).toBe(
			'Нажмите меню в левом углу адресной строки'
		);
		expect(instructionOf(IPAD)[0]).toBe('Нажмите три точки в правом нижнем углу');
	});

	it('Chrome, Edge и Firefox на iOS ведут своими путями, по версии iOS', () => {
		expect(instructionOf(iphone('CriOS/153.0 Mobile/15E148 Safari/604.1'))).toEqual([
			'Нажмите «Поделиться» в адресной строке',
			'Пролистайте вверх и нажмите «На экран «Домой»»'
		]);
		expect(instructionOf(iphone('CriOS/153.0 Mobile/15E148 Safari/604.1', '26_0'))).toEqual([
			'Нажмите «Поделиться» в адресной строке',
			'Нажмите «Ещё»',
			'Нажмите «На экран «Домой»»'
		]);
		const menuSteps = [
			'Нажмите меню в правом нижнем углу',
			'Пролистайте вверх и нажмите «Поделиться»',
			'Пролистайте вверх и нажмите «На экран «Домой»»'
		];
		expect(instructionOf(iphone('EdgiOS/153.0 Mobile/15E148 Safari/605.1.15'))).toEqual(
			menuSteps
		);
		expect(instructionOf(iphone('FxiOS/143.0 Mobile/15E148 Safari/605.1.15'))).toEqual(
			menuSteps
		);
		expect(
			instructionOf(iphone('EdgiOS/153.0 Mobile/15E148 Safari/605.1.15', '26_0'))
		).toHaveLength(4);
		expect(
			instructionOf(iphone('FxiOS/143.0 Mobile/15E148 Safari/605.1.15', '26_0'))
		).toHaveLength(3);
	});

	it('из встроенного браузера Instagram и Facebook отправляет во внешний', () => {
		const instagram = iphone('Mobile/15E148 Instagram 350.0.0');
		expect(instructionOf(instagram)[2]).toBe('Нажмите «Открыть во внешнем браузере»');
		const facebook = {
			...ANDROID_CHROME,
			language: 'en',
			userAgent: `${ANDROID_CHROME.userAgent} [FB_IAB/FB4A]`
		};
		expect(instructionOf(facebook)[2]).toBe('Нажмите «Open in external browser»');
	});

	it('Edge и Firefox на Android ставят из меню', () => {
		expect(instructionOf(ANDROID_EDGE)[1]).toBe(
			'Пролистайте влево и нажмите «Добавить на телефон»'
		);
		expect(instructionOf(ANDROID_FIREFOX)).toHaveLength(2);
	});
});

describe('экран', () => {
	it('на компьютере говорит про компьютер, на телефоне про экран «Домой»', () => {
		expect(installScreenOf(MAC_FIREFOX)).toEqual({ device: 'desktop', isSafari: false });
		expect(installScreenOf(MAC_SAFARI)).toEqual({ device: 'desktop', isSafari: true });
		expect(installScreenOf(ANDROID_CHROME)).toEqual({ device: 'mobile', isSafari: false });
		expect(installScreenOf(IPHONE_SAFARI_26)).toEqual({ device: 'mobile', isSafari: true });
		expect(installScreenOf(IPAD)).toEqual({ device: 'mobile', isSafari: true });
	});
});

describe('режим запуска', () => {
	it('на iOS верит navigator.standalone и fullscreen из-за ошибки WebKit 264218', () => {
		expect(isLaunchedInstalled(launchOf({ ...IPHONE_SAFARI_26, standalone: true }))).toBe(true);
		const fullscreen = { matchesDisplayMode: displayModeIs('fullscreen') };
		expect(isLaunchedInstalled(launchOf(IPHONE_SAFARI_26, fullscreen))).toBe(true);
		const tab = launchOf({ ...IPHONE_SAFARI_26, standalone: false });
		expect(isLaunchedInstalled(tab)).toBe(false);
		const standaloneMode = { matchesDisplayMode: displayModeIs('standalone') };
		expect(isLaunchedInstalled(launchOf(IPHONE_SAFARI_26, standaloneMode))).toBe(false);
	});

	it('на остальных смотрит display-mode, но не fullscreen', () => {
		const isAppIn = (mode: string): boolean =>
			isLaunchedInstalled(
				launchOf(ANDROID_CHROME, { matchesDisplayMode: displayModeIs(mode) })
			);
		expect(isAppIn('standalone')).toBe(true);
		expect(isAppIn('minimal-ui')).toBe(true);
		expect(isAppIn('window-controls-overlay')).toBe(true);
		expect(isAppIn('fullscreen')).toBe(false);
		expect(isAppIn('browser')).toBe(false);
		expect(isLaunchedInstalled(launchOf({ ...MAC_SAFARI, standalone: true }))).toBe(false);
	});

	it('Trusted Web Activity узнаёт по referrer android-app://', () => {
		const twa = { referrer: 'android-app://one.kato.training/' };
		expect(isLaunchedInstalled(launchOf(ANDROID_CHROME, twa))).toBe(true);
	});
});

describe('отказ от установки', () => {
	it('записывается в хранилище сессии и читается оттуда', () => {
		const storage = memoryStorage();
		expect(isInstallRefused(storage)).toBe(false);
		refuseInstall(storage);
		expect(isInstallRefused(storage)).toBe(true);
	});

	it('без хранилища живёт в памяти страницы', () => {
		const storage = pageStorage();
		refuseInstall(storage);
		expect(isInstallRefused(storage)).toBe(true);
	});
});
