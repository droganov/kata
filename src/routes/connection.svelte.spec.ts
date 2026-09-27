import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Delivery } from '../lib/session/interface/browser-session.ts';
import type * as connectionModule from './connection.svelte.ts';

import { createConnection, RETRY_MS } from './connection.svelte.ts';

type ConnectionModule = typeof connectionModule;

const ACCOUNT = 'person-a';
const OTHER_ACCOUNT = 'person-b';
const OFFLINE: Delivery = { isReachable: false, unsent: 2 };
const ONLINE: Delivery = { isReachable: true, unsent: 0 };

const scripted = (
	...deliveries: Delivery[]
): ReturnType<typeof vi.fn<(account: string) => Promise<Delivery>>> =>
	vi.fn<(account: string) => Promise<Delivery>>(() =>
		Promise.resolve(deliveries.shift() ?? ONLINE)
	);

beforeEach(() => {
	vi.useFakeTimers();
});

afterEach(() => {
	vi.useRealTimers();
});

describe('связь браузера', () => {
	it('шлёт неотправленные Отметки на сервер и по ответу судит о связи', async () => {
		const { browserConnection } =
			await vi.importActual<ConnectionModule>('./connection.svelte.ts');
		vi.stubGlobal('fetch', () => Promise.reject(new TypeError('Failed to fetch')));
		await browserConnection.sync(ACCOUNT);
		expect(browserConnection.isOffline).toBe(true);
		vi.stubGlobal('fetch', () => Promise.resolve(new Response(null, { status: 204 })));
		await browserConnection.sync(ACCOUNT);
		expect(browserConnection.isOffline).toBe(false);
		vi.unstubAllGlobals();
	});
});

describe('связь', () => {
	it('до первого запроса связь считается есть, и счётчик пуст', () => {
		const connection = createConnection(scripted());
		expect(connection.isOffline).toBe(false);
		expect(connection.unsent).toBe(0);
	});

	it('отказ запроса значит нет связи, неотправленные считаются', async () => {
		const connection = createConnection(scripted(OFFLINE));
		await connection.sync(ACCOUNT);
		expect(connection.isOffline).toBe(true);
		expect(connection.unsent).toBe(2);
	});

	it('без связи повторяет отправку сам, и связь возвращается без действий человека', async () => {
		const send = scripted(OFFLINE, OFFLINE);
		const connection = createConnection(send);
		await connection.sync(ACCOUNT);
		await vi.advanceTimersByTimeAsync(RETRY_MS);
		expect(send).toHaveBeenCalledTimes(2);
		expect(connection.isOffline).toBe(true);
		await vi.advanceTimersByTimeAsync(RETRY_MS);
		expect(send).toHaveBeenCalledTimes(3);
		expect(connection.isOffline).toBe(false);
		expect(connection.unsent).toBe(0);
		await vi.advanceTimersByTimeAsync(RETRY_MS * 3);
		expect(send).toHaveBeenCalledTimes(3);
	});

	it('на связи, но с неотправленным, тоже повторяет', async () => {
		const send = scripted({ isReachable: true, unsent: 1 });
		const connection = createConnection(send);
		await connection.sync(ACCOUNT);
		expect(connection.isOffline).toBe(false);
		expect(connection.unsent).toBe(1);
		await vi.advanceTimersByTimeAsync(RETRY_MS);
		expect(send).toHaveBeenCalledTimes(2);
		expect(connection.unsent).toBe(0);
	});

	it('событие online и возврат на вкладку только подсказывают проверить, решает запрос', async () => {
		const send = scripted(OFFLINE, OFFLINE);
		const connection = createConnection(send);
		await connection.sync(ACCOUNT);
		dispatchEvent(new Event('online'));
		await vi.waitFor(() => {
			expect(send).toHaveBeenCalledTimes(2);
		});
		expect(connection.isOffline).toBe(true);
		document.dispatchEvent(new Event('visibilitychange'));
		await vi.waitFor(() => {
			expect(send).toHaveBeenCalledTimes(3);
		});
		expect(connection.isOffline).toBe(false);
	});

	it('скрытая вкладка связь не проверяет', async () => {
		const send = scripted();
		const connection = createConnection(send);
		await connection.sync(ACCOUNT);
		vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
		document.dispatchEvent(new Event('visibilitychange'));
		await vi.advanceTimersByTimeAsync(0);
		expect(send).toHaveBeenCalledTimes(1);
	});

	it('без Аккаунта ничего не отправляет', async () => {
		const send = scripted();
		createConnection(send);
		dispatchEvent(new Event('online'));
		await vi.advanceTimersByTimeAsync(RETRY_MS);
		expect(send).not.toHaveBeenCalled();
	});

	it('Отметка во время отправки ставит ещё одну отправку следом, а не параллельно', async () => {
		const answers: PromiseWithResolvers<Delivery>[] = [];
		const send = vi.fn<(account: string) => Promise<Delivery>>(() => {
			const answer = Promise.withResolvers<Delivery>();
			answers.push(answer);
			return answer.promise;
		});
		const release = (delivery: Delivery): void => {
			answers.at(-1)?.resolve(delivery);
		};
		const connection = createConnection(send);
		const first = connection.sync(ACCOUNT);
		const second = connection.sync(ACCOUNT);
		expect(send).toHaveBeenCalledTimes(1);
		release({ isReachable: true, unsent: 1 });
		await vi.waitFor(() => {
			expect(send).toHaveBeenCalledTimes(2);
		});
		release(ONLINE);
		await Promise.all([first, second]);
		expect(connection.unsent).toBe(0);
	});

	it('ответ по прежнему Аккаунту не показывается после переключения', async () => {
		const answers = new Map<string, (delivery: Delivery) => void>();
		const send = vi.fn(
			(account: string) =>
				new Promise<Delivery>((resolve) => {
					answers.set(account, resolve);
				})
		);
		const connection = createConnection(send);
		const first = connection.sync(ACCOUNT);
		const second = connection.sync(OTHER_ACCOUNT);
		answers.get(ACCOUNT)!(OFFLINE);
		await vi.waitFor(() => {
			expect(send).toHaveBeenLastCalledWith(OTHER_ACCOUNT);
		});
		expect(connection.isOffline).toBe(false);
		answers.get(OTHER_ACCOUNT)!(OFFLINE);
		await Promise.all([first, second]);
		expect(connection.isOffline).toBe(true);
	});
});
