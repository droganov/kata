import type { RequestEvent } from '@sveltejs/kit';

import { WEB_MANIFEST_MEDIA_TYPE, webManifestOf } from './web-manifest.ts';

const CONTENT_TYPE = 'content-type';

export const GET = ({ url }: Pick<RequestEvent, 'url'>): Response =>
	Response.json(webManifestOf(process.env.ORIGIN ?? url.origin), {
		headers: { [CONTENT_TYPE]: WEB_MANIFEST_MEDIA_TYPE }
	});
