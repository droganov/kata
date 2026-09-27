export interface Agent {
	readonly language: string;
	readonly maxTouchPoints: number;
	readonly platform: string;
	readonly standalone?: boolean;
	readonly userAgent: string;
}

export type InstallInstruction =
	| { readonly kind: 'prompt' }
	| { readonly kind: StepsKind; readonly steps: readonly InstallStep[] }
	| { readonly kind: UnsupportedKind; readonly text: string };

export interface InstallScreen {
	readonly device: 'desktop' | 'mobile';
	readonly isSafari: boolean;
}

export interface InstallStep {
	readonly icon?: StepIcon;
	readonly text: string;
}

export interface Launch {
	readonly agent: Agent;
	readonly matchesDisplayMode: (mode: string) => boolean;
	readonly referrer: string;
}

type Localize = (phrases: readonly Phrase[]) => InstallInstruction;

interface Phrase {
	readonly en: string;
	readonly icon?: StepIcon;
	readonly ru: string;
}

type StepIcon = 'add-to-home' | 'more' | 'share';

type StepsKind = 'steps';

type UnsupportedKind = 'unsupported';

const STEPS_KIND: StepsKind = 'steps';
const UNSUPPORTED_KIND: UnsupportedKind = 'unsupported';
const PROMPT_INSTRUCTION: InstallInstruction = { kind: 'prompt' };
const DESKTOP: InstallScreen['device'] = 'desktop';
const MOBILE: InstallScreen['device'] = 'mobile';

const REFUSAL_KEY = 'training:install-refused';
const REFUSED = 'true';

const RUSSIAN = 'ru';
const IOS_DEVICE = /iPhone|iPad|iPod/;
const IPADOS_PLATFORM = 'MacIntel';
const MACOS = 'Macintosh';
const WINDOWS = 'Windows';
const MOBILE_AGENT = /Android|Mobile/;
const ANDROID = /Android/i;
const IN_APP_BROWSER = /Instagram|FBAN|FBAV|FBIOS|FB_IAB|FB4A/i;
const EDGE = /Edg/i;
const CHROME = /Chrome|Chromium|CriOS/i;
const FIREFOX = /Firefox|FxiOS/i;
const SAFARI = /Safari/i;
const IOS_VERSION = /CPU (?:iPhone )?OS (\d+)/;
const SAFARI_VERSION = /Version\/(\d+)/;
const IOS_26 = 26;
const IOS_27 = 27;
const APP_DISPLAY_MODES = ['standalone', 'minimal-ui', 'window-controls-overlay'];
const IOS_APP_DISPLAY_MODE = 'fullscreen';
const TRUSTED_WEB_ACTIVITY = 'android-app://';

const SHARE_ICON: StepIcon = 'share';
const MORE_ICON: StepIcon = 'more';
const ADD_TO_HOME_ICON: StepIcon = 'add-to-home';
const SHARE: Phrase = { en: 'Нажмите «Share»', icon: SHARE_ICON, ru: 'Нажмите «Поделиться»' };
const SHARE_IN_ADDRESS_BAR: Phrase = {
	en: 'Нажмите «Share» в адресной строке',
	icon: SHARE_ICON,
	ru: 'Нажмите «Поделиться» в адресной строке'
};
const SWIPE_TO_SHARE: Phrase = {
	en: 'Пролистайте вверх и нажмите «Share»',
	icon: SHARE_ICON,
	ru: 'Пролистайте вверх и нажмите «Поделиться»'
};
const ADD_TO_HOME: Phrase = {
	en: 'Нажмите «Add to Home Screen»',
	icon: ADD_TO_HOME_ICON,
	ru: 'Нажмите «На экран «Домой»»'
};
const SWIPE_TO_ADD_TO_HOME: Phrase = {
	en: 'Пролистайте вверх и нажмите «Add to Home Screen»',
	icon: ADD_TO_HOME_ICON,
	ru: 'Пролистайте вверх и нажмите «На экран «Домой»»'
};
const VIEW_MORE: Phrase = { en: 'Нажмите «View More»', icon: MORE_ICON, ru: 'Нажмите «Ещё»' };
const MORE_DOTS: Phrase = {
	en: 'Нажмите три точки меню «More»',
	icon: MORE_ICON,
	ru: 'Нажмите три точки меню «Ещё»'
};
const MENU_BOTTOM_RIGHT = 'Нажмите меню в правом нижнем углу';
const same = (text: string): Phrase => ({ en: text, ru: text });
const dots = (text: string): Phrase => ({ en: text, icon: MORE_ICON, ru: text });

const IN_APP_STEPS: readonly Phrase[] = [
	same('Это встроенный браузер другого приложения, отсюда поставить нельзя'),
	dots('Нажмите три точки в правом верхнем углу'),
	{ en: 'Нажмите «Open in external browser»', ru: 'Нажмите «Открыть во внешнем браузере»' }
];
const IOS_SAFARI_STEPS: readonly Phrase[] = [SHARE, SWIPE_TO_ADD_TO_HOME];
const IOS_26_SAFARI_STEPS: readonly Phrase[] = [
	dots('Нажмите три точки в правом нижнем углу'),
	SHARE,
	MORE_DOTS,
	ADD_TO_HOME
];
const IOS_27_SAFARI_STEPS: readonly Phrase[] = [
	same('Нажмите меню в левом углу адресной строки'),
	SHARE,
	MORE_DOTS,
	ADD_TO_HOME
];
const IOS_CHROME_STEPS: readonly Phrase[] = [SHARE_IN_ADDRESS_BAR, SWIPE_TO_ADD_TO_HOME];
const IOS_26_CHROME_STEPS: readonly Phrase[] = [SHARE_IN_ADDRESS_BAR, VIEW_MORE, ADD_TO_HOME];
const IOS_MENU_STEPS: readonly Phrase[] = [
	same(MENU_BOTTOM_RIGHT),
	SWIPE_TO_SHARE,
	SWIPE_TO_ADD_TO_HOME
];
const IOS_26_EDGE_STEPS: readonly Phrase[] = [
	same(MENU_BOTTOM_RIGHT),
	SWIPE_TO_SHARE,
	VIEW_MORE,
	ADD_TO_HOME
];
const IOS_26_FIREFOX_STEPS: readonly Phrase[] = [
	SHARE_IN_ADDRESS_BAR,
	VIEW_MORE,
	SWIPE_TO_ADD_TO_HOME
];
const ANDROID_EDGE_STEPS: readonly Phrase[] = [
	same(MENU_BOTTOM_RIGHT),
	{
		en: 'Пролистайте влево и нажмите «Add to phone»',
		ru: 'Пролистайте влево и нажмите «Добавить на телефон»'
	}
];
const ANDROID_FIREFOX_STEPS: readonly Phrase[] = [
	same('Нажмите меню в правом верхнем или правом нижнем углу, смотря где адресная строка'),
	{
		en: 'Пролистайте вверх и нажмите «Install» или «More», затем «Add app to Home screen»',
		ru: 'Пролистайте вверх и нажмите «Установить» или «Ещё», затем «Добавить приложение на главный экран»'
	}
];
const MACOS_SAFARI_STEPS: readonly Phrase[] = [
	{
		en: 'Нажмите «Share» справа на панели инструментов Safari',
		icon: SHARE_ICON,
		ru: 'Нажмите «Поделиться» справа на панели инструментов Safari'
	},
	{ en: 'Выберите «Add to Dock»', ru: 'Выберите «Добавить в Dock»' },
	{
		en: 'Нажмите «Add»: приложение появится в Dock',
		ru: 'Нажмите «Добавить»: приложение появится в Dock'
	}
];
const WINDOWS_FIREFOX_STEPS: readonly Phrase[] = [
	{
		en: 'Нажмите в адресной строке кнопку «Add tab to taskbar»',
		ru: 'Нажмите в адресной строке кнопку «Добавить вкладку на панель задач»'
	},
	same('Firefox откроет приложение в отдельном окне и предложит закрепить его на панели задач')
];

const unsupported = (text: string): InstallInstruction => ({ kind: UNSUPPORTED_KIND, text });

const MACOS_FIREFOX = unsupported(
	'Firefox на Mac не ставит веб-приложения. Скопируйте адрес и откройте его в Safari: там этот экран покажет, как поставить.'
);
const LINUX_FIREFOX = unsupported(
	'Firefox на Linux не ставит веб-приложения. Скопируйте адрес и откройте его в Chrome или Edge: там этот экран покажет кнопку установки.'
);
const IOS_OTHER = unsupported(
	'Этот браузер не ставит веб-приложения. Скопируйте адрес и откройте его в Safari: там этот экран покажет, как поставить.'
);
const OTHER = unsupported(
	'Этот браузер не ставит веб-приложения. Скопируйте адрес и откройте его в Chrome или Edge: там этот экран покажет кнопку установки.'
);

const isIos = (agent: Agent): boolean =>
	IOS_DEVICE.test(agent.userAgent) ||
	(agent.platform === IPADOS_PLATFORM && agent.maxTouchPoints > 1);

const isMacSafari = (userAgent: string): boolean =>
	userAgent.includes(MACOS) &&
	SAFARI.test(userAgent) &&
	!CHROME.test(userAgent) &&
	!FIREFOX.test(userAgent);

const majorOf = (userAgent: string, pattern: RegExp): number =>
	Number(pattern.exec(userAgent)?.[1] ?? 0);

const iosSafariSteps = (userAgent: string): readonly Phrase[] => {
	const version = majorOf(userAgent, SAFARI_VERSION);
	if (version >= IOS_27) return IOS_27_SAFARI_STEPS;
	return version === IOS_26 ? IOS_26_SAFARI_STEPS : IOS_SAFARI_STEPS;
};

const iosSteps = (userAgent: string): readonly Phrase[] | undefined => {
	const isModern = majorOf(userAgent, IOS_VERSION) >= IOS_26;
	if (EDGE.test(userAgent)) return isModern ? IOS_26_EDGE_STEPS : IOS_MENU_STEPS;
	if (CHROME.test(userAgent)) return isModern ? IOS_26_CHROME_STEPS : IOS_CHROME_STEPS;
	if (FIREFOX.test(userAgent)) return isModern ? IOS_26_FIREFOX_STEPS : IOS_MENU_STEPS;
	return SAFARI.test(userAgent) ? iosSafariSteps(userAgent) : undefined;
};

const firefoxInstruction = (userAgent: string, localize: Localize): InstallInstruction => {
	if (ANDROID.test(userAgent)) return localize(ANDROID_FIREFOX_STEPS);
	if (userAgent.includes(WINDOWS)) return localize(WINDOWS_FIREFOX_STEPS);
	return userAgent.includes(MACOS) ? MACOS_FIREFOX : LINUX_FIREFOX;
};

const otherInstruction = (userAgent: string, localize: Localize): InstallInstruction => {
	if (FIREFOX.test(userAgent)) return firefoxInstruction(userAgent, localize);
	if (EDGE.test(userAgent) && ANDROID.test(userAgent)) return localize(ANDROID_EDGE_STEPS);
	return isMacSafari(userAgent) ? localize(MACOS_SAFARI_STEPS) : OTHER;
};

const stepsIn =
	(isRussian: boolean) =>
	(phrase: Phrase): InstallStep => {
		const text = isRussian ? phrase.ru : phrase.en;
		return phrase.icon === undefined ? { text } : { icon: phrase.icon, text };
	};

const localizeIn =
	(language: string): Localize =>
	(phrases) => ({
		kind: STEPS_KIND,
		steps: phrases.map(stepsIn(language.startsWith(RUSSIAN)))
	});

export const installInstructionOf = (
	agent: Agent,
	canPromptInstall: boolean
): InstallInstruction => {
	if (canPromptInstall) return PROMPT_INSTRUCTION;
	const { userAgent } = agent;
	const localize = localizeIn(agent.language);
	if (IN_APP_BROWSER.test(userAgent)) return localize(IN_APP_STEPS);
	if (!isIos(agent)) return otherInstruction(userAgent, localize);
	const steps = iosSteps(userAgent);
	return steps === undefined ? IOS_OTHER : localize(steps);
};

export const installScreenOf = (agent: Agent): InstallScreen => {
	const isApple = isIos(agent);
	return {
		device: isApple || MOBILE_AGENT.test(agent.userAgent) ? MOBILE : DESKTOP,
		isSafari: isApple || isMacSafari(agent.userAgent)
	};
};

export const isLaunchedInstalled = ({ agent, matchesDisplayMode, referrer }: Launch): boolean => {
	if (isIos(agent)) return agent.standalone === true || matchesDisplayMode(IOS_APP_DISPLAY_MODE);
	return (
		referrer.startsWith(TRUSTED_WEB_ACTIVITY) ||
		APP_DISPLAY_MODES.some((mode) => matchesDisplayMode(mode))
	);
};

export const isInstallRefused = (storage: Pick<Storage, 'getItem'>): boolean =>
	storage.getItem(REFUSAL_KEY) !== null;

export const refuseInstall = (storage: Pick<Storage, 'setItem'>): void => {
	storage.setItem(REFUSAL_KEY, REFUSED);
};

export const installStepsOf = (instruction: InstallInstruction): readonly InstallStep[] =>
	instruction.kind === STEPS_KIND ? instruction.steps : [];

export const unsupportedTextOf = (instruction: InstallInstruction): string | undefined =>
	instruction.kind === UNSUPPORTED_KIND ? instruction.text : undefined;

export const pageStorage = (): Pick<Storage, 'getItem' | 'setItem'> => {
	const items = new Map<string, string>();
	return {
		getItem: (key) => items.get(key) ?? null,
		setItem: (key, value) => {
			items.set(key, value);
		}
	};
};
