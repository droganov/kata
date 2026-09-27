export interface ShellAssets {
	readonly build: readonly string[];
	readonly files: readonly string[];
	readonly version: string;
}

export interface ShellCache {
	readonly addAll: (requests: string[]) => Promise<void>;
	readonly match: (key: string) => Promise<Response | undefined>;
	readonly put: (key: string, response: Response) => Promise<void>;
}

export interface ShellCaches {
	readonly delete: (name: string) => Promise<boolean>;
	readonly keys: () => Promise<string[]>;
	readonly match: (
		request: Request,
		options: { readonly cacheName: string }
	) => Promise<Response | undefined>;
	readonly open: (name: string) => Promise<ShellCache>;
}

export interface ShellWorker {
	readonly addEventListener: (type: string, listener: (event: Event) => void) => void;
	readonly caches: ShellCaches;
	readonly fetch: (request: Request) => Promise<Response>;
	readonly location: { readonly origin: string };
}

interface ExtendableEventLike extends Event {
	readonly waitUntil: (work: Promise<unknown>) => void;
}

interface FetchEventLike extends Event {
	readonly request: Request;
	readonly respondWith: (response: Promise<Response>) => void;
}

interface WorkerLifecycle {
	readonly clients: { readonly claim: () => Promise<void> };
	readonly skipWaiting: () => Promise<void>;
}

const SHELL_PATH = '/';
const AUTH_SESSION_PATH = '/auth/session';
export const NETWORK_DEADLINE_MS = 5000;

const SHELL_CACHE = 'training-shell-';
const DATA_CACHE = 'training-data-';
const CACHE_PREFIX = 'training-';
const DATA_SUFFIX = '/__data.json';
const INVALIDATED_PARAM = 'x-sveltekit-invalidated';
const EVERY_NODE = '1';
const NAVIGATE_MODE = 'navigate';
const GET_METHOD = 'GET';
const INSTALL_EVENT = 'install';
const ACTIVATE_EVENT = 'activate';
const FETCH_EVENT = 'fetch';
const WAIT_UNTIL = 'waitUntil';
const RESPOND_WITH = 'respondWith';
const SKIP_WAITING = 'skipWaiting';
const CLIENTS = 'clients';
const REQUEST = 'request';
const NO_ANSWER = 'Сеть не ответила в срок';

const isExtendableEvent = (event: Event): event is ExtendableEventLike =>
	Reflect.has(event, WAIT_UNTIL);

const hasLifecycle = <Scope extends object>(scope: Scope): scope is Scope & WorkerLifecycle =>
	Reflect.has(scope, SKIP_WAITING) && Reflect.has(scope, CLIENTS);

const isFetchEvent = (event: Event): event is FetchEventLike =>
	Reflect.has(event, RESPOND_WITH) && Reflect.get(event, REQUEST) instanceof Request;

const dataKeyOf = (url: URL): string =>
	`${url.pathname}?${INVALIDATED_PARAM}=${url.searchParams.get(INVALIDATED_PARAM) ?? ''}`;

const everyNodeOf = (url: URL): URL => {
	const full = new URL(url);
	const invalidated = url.searchParams.get(INVALIDATED_PARAM) ?? '';
	full.searchParams.set(INVALIDATED_PARAM, EVERY_NODE.repeat(invalidated.length));
	return full;
};

const withinDeadline = async (response: Promise<Response>): Promise<Response> => {
	let timer: ReturnType<typeof setTimeout> | undefined;
	const deadline = new Promise<never>((_resolve, reject) => {
		timer = setTimeout(() => {
			reject(new Error(NO_ANSWER));
		}, NETWORK_DEADLINE_MS);
	});
	try {
		return await Promise.race([response, deadline]);
	} finally {
		clearTimeout(timer);
	}
};

export const serveOffline = (worker: ShellWorker, { build, files, version }: ShellAssets): void => {
	const shellCache = SHELL_CACHE + version;
	const dataCache = DATA_CACHE + version;
	const immutable = new Set(build);
	const staticFiles = new Set(files);

	const precache = async (): Promise<void> => {
		const cache = await worker.caches.open(shellCache);
		await cache.addAll([...build, ...files, SHELL_PATH]);
		if (hasLifecycle(worker)) await worker.skipWaiting();
	};
	const takeOver = async (): Promise<void> => {
		await dropStale();
		if (hasLifecycle(worker)) await worker.clients.claim();
	};
	const dropStale = async (): Promise<void> => {
		const names = await worker.caches.keys();
		const current = new Set([dataCache, shellCache]);
		await Promise.all(
			names
				.filter((name) => name.startsWith(CACHE_PREFIX) && !current.has(name))
				.map((name) => worker.caches.delete(name))
		);
	};
	const cacheFirst = async (request: Request): Promise<Response> => {
		const cached = await worker.caches.match(request, { cacheName: shellCache });
		return cached ?? worker.fetch(request);
	};
	const networkFirst = async (
		request: Request,
		cacheName: string,
		key: string,
		fallback = key
	): Promise<Response> => {
		const cache = await worker.caches.open(cacheName);
		const cached = async (): Promise<Response | undefined> =>
			(await cache.match(key)) ?? (await cache.match(fallback));
		try {
			const response = await withinDeadline(worker.fetch(request));
			if (!response.ok) return (await cached()) ?? response;
			await cache.put(key, response.clone());
			return response;
		} catch {
			return (await cached()) ?? Response.error();
		}
	};
	const keepEveryNode = async (full: URL): Promise<void> => {
		const cache = await worker.caches.open(dataCache);
		const key = dataKeyOf(full);
		if ((await cache.match(key)) !== undefined) return;
		try {
			const response = await withinDeadline(worker.fetch(new Request(full)));
			if (response.ok) await cache.put(key, response);
		} catch {
			return;
		}
	};
	const loadData = async (request: Request, url: URL): Promise<Response> => {
		const full = everyNodeOf(url);
		const response = await networkFirst(request, dataCache, dataKeyOf(url), dataKeyOf(full));
		if (response.ok && dataKeyOf(full) !== dataKeyOf(url)) await keepEveryNode(full);
		return response;
	};
	const forgettingData = async (request: Request): Promise<Response> => {
		try {
			return await worker.fetch(request);
		} finally {
			await worker.caches.delete(dataCache);
		}
	};
	const responseTo = (request: Request): Promise<Response> | undefined => {
		const url = new URL(request.url);
		if (url.origin !== worker.location.origin) return;
		if (request.method !== GET_METHOD)
			return url.pathname === AUTH_SESSION_PATH ? forgettingData(request) : undefined;
		if (immutable.has(url.pathname)) return cacheFirst(request);
		if (staticFiles.has(url.pathname)) return networkFirst(request, shellCache, url.pathname);
		if (request.mode === NAVIGATE_MODE)
			return networkFirst(request, shellCache, url.pathname, SHELL_PATH);
		return url.pathname.endsWith(DATA_SUFFIX) ? loadData(request, url) : undefined;
	};

	worker.addEventListener(INSTALL_EVENT, (event) => {
		if (isExtendableEvent(event)) event.waitUntil(precache());
	});
	worker.addEventListener(ACTIVATE_EVENT, (event) => {
		if (isExtendableEvent(event)) event.waitUntil(takeOver());
	});
	worker.addEventListener(FETCH_EVENT, (event) => {
		if (!isFetchEvent(event)) return;
		const response = responseTo(event.request);
		if (response !== undefined) event.respondWith(response);
	});
};
