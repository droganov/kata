import type { InstallBrowser } from '../routes/install.svelte.ts';

import { memoryStorage } from './memory-storage.ts';

export const ANDROID_CHROME =
	'Mozilla/5.0 (Linux; Android 16) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Mobile Safari/537.36';
export const IPHONE_SAFARI =
	'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1';

export interface FakeBrowser extends InstallBrowser {
	readonly fire: (event: Event) => void;
	readonly onbeforeinstallprompt?: null;
	readonly sessionStorage: Storage;
	readonly setDisplayMode: (mode: string) => void;
}

export const fakeBrowser = (
	userAgent: string,
	overrides: Partial<Pick<InstallBrowser, 'navigator'>> = {}
): FakeBrowser => {
	const target = new EventTarget();
	const media = new EventTarget();
	let displayMode = 'browser';
	const browser: FakeBrowser = {
		addEventListener: (type: string, listener: (event: Event) => void) => {
			target.addEventListener(type, listener);
		},
		document: { referrer: '' },
		fire: (event: Event) => target.dispatchEvent(event),
		matchMedia: (query: string) => ({
			addEventListener: (type: string, listener: () => void) => {
				media.addEventListener(type, listener);
			},
			matches: query === `(display-mode: ${displayMode})`
		}),
		navigator: { language: 'ru-RU', maxTouchPoints: 0, platform: '', userAgent },
		onbeforeinstallprompt: null,
		sessionStorage: memoryStorage(),
		setDisplayMode: (mode: string) => {
			displayMode = mode;
			media.dispatchEvent(new Event('change'));
		},
		...overrides
	};
	return browser;
};

export const withoutPromptHandler = (browser: FakeBrowser): FakeBrowser => {
	Reflect.deleteProperty(browser, 'onbeforeinstallprompt');
	return browser;
};

export const installPromptEvent = (outcome: string): Event & { prompted: boolean } => {
	const event = Object.assign(new Event('beforeinstallprompt', { cancelable: true }), {
		prompt: () => {
			event.prompted = true;
			return Promise.resolve();
		},
		prompted: false,
		userChoice: Promise.resolve({ outcome })
	});
	return event;
};
