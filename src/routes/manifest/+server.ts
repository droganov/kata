import type { RequestHandler } from '@sveltejs/kit';

import { WEB_MANIFEST_MEDIA_TYPE, webManifestOf } from './web-manifest.ts';

const CONTENT_TYPE = 'content-type';

export const GET: RequestHandler = ({ url }) =>
	Response.json(webManifestOf(process.env.ORIGIN ?? url.origin), {
		headers: { [CONTENT_TYPE]: WEB_MANIFEST_MEDIA_TYPE }
	});
