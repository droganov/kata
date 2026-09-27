import { afterEach, describe, expect, it, vi } from 'vitest';

import type { ShellCache, ShellCaches, ShellWorker } from './offline-shell.ts';

import { NETWORK_DEADLINE_MS, serveOffline } from './offline-shell.ts';

const ORIGIN = 'https://training.example';
const VERSION = '42';
const ASSETS = ['/_app/immutable/start.js', '/favicon.svg'];

interface Harness {
	readonly caches: Map<string, Map<string, string>>;
	readonly fire: (type: string, event: Event) => void;
	readonly network: ReturnType<typeof vi.fn<(request: Request) => Promise<Response>>>;
}

const fakeCache = (entries: Map<string, string>): ShellCache => ({
	addAll: (requests) => {
		for (const request of requests) entries.set(request, `закэшировано ${request}`);
		return Promise.resolve();
	},
	match: (key) => {
		const body = entries.get(key);
		return Promise.resolve(body === undefined ? undefined : new Response(body));
	},
	put: async (key, response) => {
		entries.set(key, await response.text());
	}
});

const fakeCaches = (stores: Map<string, Map<string, string>>): ShellCaches => {
	const storeOf = (name: string): Map<string, string> => {
		const found = stores.get(name) ?? new Map<string, string>();
		stores.set(name, found);
		return found;
	};
	return {
		delete: (name) => Promise.resolve(stores.delete(name)),
		keys: () => Promise.resolve(stores.keys().toArray()),
		match: (request, { cacheName }) =>
			fakeCache(storeOf(cacheName)).match(new URL(request.url).pathname),
		open: (name) => Promise.resolve(fakeCache(storeOf(name)))
	};
};

const harness = (): Harness => {
	const caches = new Map<string, Map<string, string>>();
	const listeners = new Map<string, (event: Event) => void>();
	const network = vi.fn((request: Request) =>
		Promise.resolve(new Response(`сеть ${new URL(request.url).pathname}`))
	);
	const worker: ShellWorker = {
		addEventListener: (type, listener) => {
			listeners.set(type, listener);
		},
		caches: fakeCaches(caches),
		fetch: network,
		location: { origin: ORIGIN }
	};
	serveOffline(worker, { assets: ASSETS, version: VERSION });
	return { caches, fire: (type, event) => listeners.get(type)?.(event), network };
};

const extendable = (): { readonly done: () => Promise<unknown>; readonly event: Event } => {
	const work: Promise<unknown>[] = [];
	const event = Object.assign(new Event('install'), {
		waitUntil: (promise: Promise<unknown>) => {
			work.push(promise);
		}
	});
	return { done: () => Promise.all(work), event };
};

const fetched = (
	target: Harness,
	path: string,
	init: RequestInit & { readonly navigate?: boolean } = {}
): Promise<Response> | undefined => {
	const request = new Request(new URL(path, ORIGIN), init);
	if (init.navigate === true) Object.defineProperty(request, 'mode', { value: 'navigate' });
	let answer: Promise<Response> | undefined;
	const event = Object.assign(new Event('fetch'), {
		request,
		respondWith: (response: Promise<Response>) => {
			answer = response;
		}
	});
	target.fire('fetch', event);
	return answer;
};

const textOf = async (response: Promise<Response> | undefined): Promise<string> => {
	const answered = await response!;
	return answered.text();
};

const offline = (target: Harness): void => {
	target.network.mockImplementation(() => Promise.reject(new TypeError('Failed to fetch')));
};

afterEach(() => {
	vi.useRealTimers();
});

describe('оболочка приложения без сети', () => {
	it('при установке кладёт сборку, статику и оболочку в кэш версии', async () => {
		const target = harness();
		const { done, event } = extendable();
		target.fire('install', event);
		await done();
		expect(target.caches.get('training-shell-42')!.keys().toArray()).toEqual([...ASSETS, '/']);
	});

	it('при активации убирает кэши прежних версий, чужие кэши не трогает', async () => {
		const target = harness();
		target.caches.set('training-shell-41', new Map());
		target.caches.set('training-data-41', new Map());
		target.caches.set('training-data-42', new Map());
		target.caches.set('чужой', new Map());
		const { done, event } = extendable();
		target.fire('activate', event);
		await done();
		expect(target.caches.keys().toArray()).toEqual(['training-data-42', 'чужой']);
	});

	it('сборку отдаёт из кэша, а чего в кэше нет, берёт из сети', async () => {
		const target = harness();
		const { done, event } = extendable();
		target.fire('install', event);
		await done();
		offline(target);
		expect(await textOf(fetched(target, ASSETS[0]!))).toBe(`закэшировано ${ASSETS[0]!}`);
		target.caches.get('training-shell-42')!.delete('/favicon.svg');
		target.network.mockResolvedValue(new Response('из сети'));
		expect(await textOf(fetched(target, '/favicon.svg'))).toBe('из сети');
	});

	it('страницу берёт из сети и запоминает, без сети отдаёт запомненную', async () => {
		const target = harness();
		expect(await textOf(fetched(target, '/programs/p-1?item=3', { navigate: true }))).toBe(
			'сеть /programs/p-1'
		);
		offline(target);
		expect(await textOf(fetched(target, '/programs/p-1?item=5', { navigate: true }))).toBe(
			'сеть /programs/p-1'
		);
	});

	it('без сети незнакомую страницу открывает оболочкой, без оболочки отказывает', async () => {
		const target = harness();
		offline(target);
		const refused = await fetched(target, '/account', { navigate: true });
		expect(refused?.type).toBe('error');
		target.caches.get('training-shell-42')!.set('/', 'оболочка');
		expect(await textOf(fetched(target, '/account', { navigate: true }))).toBe('оболочка');
	});

	it('данные загрузки берёт из сети, без сети отдаёт последние', async () => {
		const target = harness();
		const address = '/__data.json?x-sveltekit-invalidated=11';
		expect(await textOf(fetched(target, address))).toBe('сеть /__data.json');
		offline(target);
		expect(await textOf(fetched(target, address))).toBe('сеть /__data.json');
		expect(await textOf(fetched(target, '/__data.json?x-sveltekit-invalidated=01'))).toBe(
			'сеть /__data.json'
		);
		const unmarked = await fetched(target, '/programs/p-1/__data.json');
		expect(unmarked?.type).toBe('error');
	});

	it('переход внутри приложения запоминает и полные данные: перезагрузка без сети их найдёт', async () => {
		const target = harness();
		target.network.mockImplementation((request) =>
			Promise.resolve(new Response(`сеть ${new URL(request.url).search}`))
		);
		expect(
			await textOf(
				fetched(target, '/programs/p-1/__data.json?item=3&x-sveltekit-invalidated=01')
			)
		).toBe('сеть ?item=3&x-sveltekit-invalidated=01');
		expect(target.network).toHaveBeenCalledTimes(2);
		await textOf(fetched(target, '/programs/p-1/__data.json?x-sveltekit-invalidated=01'));
		expect(target.network).toHaveBeenCalledTimes(3);
		offline(target);
		expect(
			await textOf(fetched(target, '/programs/p-1/__data.json?x-sveltekit-invalidated=11'))
		).toBe('сеть ?item=3&x-sveltekit-invalidated=11');
	});

	it.each([
		['сеть отказала', () => Promise.reject(new TypeError('Failed to fetch'))],
		['сервер ответил ошибкой', () => Promise.resolve(new Response('сбой', { status: 500 }))]
	])('полные данные не запоминает, когда %s', async (_case, answer) => {
		const target = harness();
		target.network
			.mockResolvedValueOnce(new Response('частично'))
			.mockImplementationOnce(answer);
		expect(await textOf(fetched(target, '/__data.json?x-sveltekit-invalidated=01'))).toBe(
			'частично'
		);
		expect(
			target.caches.get('training-data-42')?.has('/__data.json?x-sveltekit-invalidated=11')
		).toBe(false);
	});

	it('ошибка сервера отдаёт запомненное, как и отказ сети', async () => {
		const target = harness();
		await textOf(fetched(target, '/programs/p-1', { navigate: true }));
		target.network.mockResolvedValue(new Response('сбой', { status: 503 }));
		expect(await textOf(fetched(target, '/programs/p-1', { navigate: true }))).toBe(
			'сеть /programs/p-1'
		);
	});

	it('ответ с ошибкой не запоминает', async () => {
		const target = harness();
		target.network.mockResolvedValue(new Response('сбой', { status: 500 }));
		const failed = await fetched(target, '/__data.json');
		expect(failed?.status).toBe(500);
		offline(target);
		const missing = await fetched(target, '/__data.json');
		expect(missing?.type).toBe('error');
	});

	it('точка доступа без интернета молчит: после срока отдаёт запомненное', async () => {
		const target = harness();
		await textOf(fetched(target, '/', { navigate: true }));
		vi.useFakeTimers();
		target.network.mockImplementation(() => Promise.withResolvers<Response>().promise);
		const answer = fetched(target, '/', { navigate: true });
		await vi.advanceTimersByTimeAsync(NETWORK_DEADLINE_MS);
		expect(await textOf(answer)).toBe('сеть /');
	});

	it('вход и выход сбрасывают запомненные данные: там лежит кука Сеанса', async () => {
		const target = harness();
		await textOf(fetched(target, '/__data.json'));
		const signedIn = await fetched(target, '/auth/session', { method: 'POST' });
		expect(await signedIn?.text()).toBe('сеть /auth/session');
		expect(target.caches.has('training-data-42')).toBe(false);
		await textOf(fetched(target, '/__data.json'));
		offline(target);
		await expect(fetched(target, '/auth/session', { method: 'DELETE' })).rejects.toThrow(
			'Failed to fetch'
		);
		expect(target.caches.has('training-data-42')).toBe(false);
	});

	it('не трогает Отметки, сборку Занятия, чужие адреса и прочие запросы', () => {
		const target = harness();
		expect(fetched(target, '/marks', { method: 'POST' })).toBeUndefined();
		expect(fetched(target, '/programs/p-1/session', { method: 'POST' })).toBeUndefined();
		expect(fetched(target, 'https://cdn.example/lib.js')).toBeUndefined();
		expect(fetched(target, '/manifest')).toBeUndefined();
	});

	it('события без ожидания и без запроса пропускает', () => {
		const target = harness();
		target.fire('install', new Event('install'));
		target.fire('activate', new Event('activate'));
		target.fire('fetch', new Event('fetch'));
		expect(target.network).not.toHaveBeenCalled();
	});
});
