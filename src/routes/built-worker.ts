import { readFile } from 'node:fs/promises';
import path from 'node:path';

export const WORKER_PATH = '/service-worker.js';

const BUILT_WORKER = '.deno-deploy/static/service-worker.js';
const NOT_FOUND = 404;
const UTF8 = 'utf8';
const WORKER_HEADERS = {
	'cache-control': 'no-cache',
	'content-type': 'text/javascript; charset=utf-8'
};

export const builtWorker = async (): Promise<Response> => {
	try {
		const worker = await readFile(path.join(process.cwd(), BUILT_WORKER), UTF8);
		return new Response(worker, { headers: WORKER_HEADERS });
	} catch {
		return new Response(null, { status: NOT_FOUND });
	}
};
