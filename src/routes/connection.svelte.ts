import type { Delivery } from '../lib/session/interface/browser-session.ts';

import { sendBrowserMarks } from '../lib/session/interface/browser-session.ts';

export interface Connection {
	readonly isOffline: boolean;
	readonly sync: (account: string) => Promise<void>;
	readonly unsent: number;
}

export const RETRY_MS = 15_000;

const ONLINE_EVENT = 'online';
const VISIBILITY_EVENT = 'visibilitychange';
const VISIBLE = 'visible';

export const createConnection = (send: (account: string) => Promise<Delivery>): Connection => {
	let isOffline = $state(false);
	let unsent = $state(0);
	let watched = '';
	let running: Promise<void> | undefined;
	let requested = 0;
	let retry: ReturnType<typeof setTimeout> | undefined;

	const retryLater = (): void => {
		clearTimeout(retry);
		retry =
			isOffline || unsent > 0
				? setTimeout(() => {
						void resync();
					}, RETRY_MS)
				: undefined;
	};
	const deliver = async (account: string): Promise<void> => {
		const delivery = await send(account);
		if (account !== watched) return;
		isOffline = !delivery.isReachable;
		unsent = delivery.unsent;
	};
	const deliverWhileRequested = async (): Promise<void> => {
		let served: number;
		do {
			served = requested;
			await deliver(watched);
		} while (served !== requested);
	};
	const run = async (): Promise<void> => {
		try {
			await deliverWhileRequested();
		} finally {
			running = undefined;
		}
		retryLater();
	};
	const resync = (): Promise<void> => {
		if (watched === '') return Promise.resolve();
		requested += 1;
		running ??= run();
		return running;
	};

	addEventListener(ONLINE_EVENT, () => {
		void resync();
	});
	document.addEventListener(VISIBILITY_EVENT, () => {
		if (document.visibilityState === VISIBLE) void resync();
	});

	return {
		get isOffline() {
			return isOffline;
		},
		sync: (account) => {
			watched = account;
			return resync();
		},
		get unsent() {
			return unsent;
		}
	};
};

export const browserConnection = createConnection((account) =>
	sendBrowserMarks(account, (input, init) => fetch(input, init))
);
