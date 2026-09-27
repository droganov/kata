import type { Agent, InstallInstruction, InstallScreen } from './install-promotion.ts';

import {
	installInstructionOf,
	installScreenOf,
	isInstallRefused,
	isLaunchedInstalled,
	pageStorage,
	refuseInstall
} from './install-promotion.ts';

export interface Install {
	readonly canPrompt: boolean;
	readonly instruction: InstallInstruction;
	readonly isShown: boolean;
	readonly prompt: () => Promise<void>;
	readonly refuse: () => void;
	readonly screen: InstallScreen;
}

export interface InstallBrowser {
	readonly addEventListener: (type: string, listener: (event: Event) => void) => void;
	readonly document: { readonly referrer: string };
	readonly matchMedia: (query: string) => DisplayModeQuery;
	readonly navigator: Agent;
	readonly sessionStorage: Pick<Storage, 'getItem' | 'setItem'>;
}

interface DeferredPrompt extends Event {
	readonly prompt: () => Promise<void>;
	readonly userChoice: Promise<{ readonly outcome: 'accepted' | 'dismissed' }>;
}

interface DisplayModeQuery {
	readonly addEventListener: (type: 'change', listener: () => void) => void;
	readonly matches: boolean;
}

const BEFORE_INSTALL_PROMPT = 'beforeinstallprompt';
const INSTALL_PROMPT_HANDLER = 'onbeforeinstallprompt';
const APP_INSTALLED = 'appinstalled';
const CHANGE = 'change';
const ACCEPTED = 'accepted';
const PROMPT_METHOD = 'prompt';
const EARLY_PROMPT = 'deferredInstallPrompt';
const DISPLAY_MODES = [
	'(display-mode: standalone)',
	'(display-mode: minimal-ui)',
	'(display-mode: window-controls-overlay)',
	'(display-mode: fullscreen)'
].join(', ');

const isDeferredPrompt = (event: Event): event is DeferredPrompt =>
	Reflect.has(event, PROMPT_METHOD);

const earlyPromptOf = (browser: InstallBrowser): DeferredPrompt | undefined => {
	const early: unknown = Reflect.get(browser, EARLY_PROMPT);
	return early instanceof Event && isDeferredPrompt(early) ? early : undefined;
};

const storageOf = (browser: InstallBrowser): Pick<Storage, 'getItem' | 'setItem'> => {
	try {
		return browser.sessionStorage;
	} catch {
		return pageStorage();
	}
};

export const createInstall = (browser: InstallBrowser): Install => {
	const storage = storageOf(browser);
	const instruction = installInstructionOf(
		browser.navigator,
		Reflect.has(browser, INSTALL_PROMPT_HANDLER)
	);
	const isLaunched = (): boolean =>
		isLaunchedInstalled({
			agent: browser.navigator,
			matchesDisplayMode: (mode) => browser.matchMedia(`(display-mode: ${mode})`).matches,
			referrer: browser.document.referrer
		});
	let isLaunchedApp = $state(isLaunched());
	let hasInstalled = $state(false);
	let isRefused = $state(isInstallRefused(storage));
	let deferred = $state(earlyPromptOf(browser));

	browser.matchMedia(DISPLAY_MODES).addEventListener(CHANGE, () => {
		isLaunchedApp = isLaunched();
	});
	browser.addEventListener(BEFORE_INSTALL_PROMPT, (event) => {
		if (!isDeferredPrompt(event)) return;
		event.preventDefault();
		deferred = event;
	});
	browser.addEventListener(APP_INSTALLED, () => {
		hasInstalled = true;
		deferred = undefined;
	});

	return {
		get canPrompt() {
			return deferred !== undefined;
		},
		instruction,
		get isShown() {
			return !isLaunchedApp && !hasInstalled && !isRefused;
		},
		prompt: async () => {
			const event = deferred;
			if (event === undefined) return;
			deferred = undefined;
			await event.prompt();
			const choice = await event.userChoice;
			if (choice.outcome === ACCEPTED) hasInstalled = true;
		},
		refuse: () => {
			refuseInstall(storage);
			isRefused = true;
		},
		screen: installScreenOf(browser.navigator)
	};
};

export const browserInstall = createInstall(globalThis);
