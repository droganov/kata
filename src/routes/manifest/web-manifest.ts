export interface WebManifest {
	readonly background_color: string;
	readonly display: DisplayMode;
	readonly icons: readonly WebManifestIcon[];
	readonly id: string;
	readonly name: string;
	readonly scope: string;
	readonly short_name: string;
	readonly start_url: string;
	readonly theme_color: string;
}

type DisplayMode = 'browser' | 'fullscreen' | 'minimal-ui' | 'standalone';

type IconPurpose = 'any' | 'maskable' | 'monochrome';

interface WebManifestIcon {
	readonly purpose?: IconPurpose;
	readonly sizes: string;
	readonly src: string;
	readonly type: string;
}

const APP_NAME = 'Training';
const START_PATH = '/?source=pwa';
const SCOPE_PATH = '/';
const DISPLAY_MODE: DisplayMode = 'standalone';
const BACKGROUND_COLOR = '#ffffff';
const THEME_COLOR = '#0d4c73';
const ICON_TYPE = 'image/png';
const MASKABLE_PURPOSE: IconPurpose = 'maskable';
const SIZE_192 = '192x192';
const SIZE_512 = '512x512';

const ICONS: readonly WebManifestIcon[] = [
	{ sizes: SIZE_192, src: '/icons/icon-192.png', type: ICON_TYPE },
	{ sizes: SIZE_512, src: '/icons/icon-512.png', type: ICON_TYPE },
	{
		purpose: MASKABLE_PURPOSE,
		sizes: SIZE_512,
		src: '/icons/icon-maskable-512.png',
		type: ICON_TYPE
	}
];

export const WEB_MANIFEST_MEDIA_TYPE = 'application/manifest+json';

export const webManifestOf = (origin: string): WebManifest => {
	const startUrl = new URL(START_PATH, origin).href;
	return {
		background_color: BACKGROUND_COLOR,
		display: DISPLAY_MODE,
		icons: ICONS,
		id: startUrl,
		name: APP_NAME,
		scope: new URL(SCOPE_PATH, origin).href,
		short_name: APP_NAME,
		start_url: startUrl,
		theme_color: THEME_COLOR
	};
};
