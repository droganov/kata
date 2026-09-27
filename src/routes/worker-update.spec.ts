import { describe, expect, it, vi } from 'vitest';

import type { WorkerContainer, WorkerPage } from './worker-update.ts';

import { followWorkerUpdates } from './worker-update.ts';

interface FakePage extends WorkerPage {
	readonly fire: (type: string) => void;
	readonly reload: ReturnType<typeof vi.fn<() => void>>;
	readonly update: ReturnType<typeof vi.fn<() => Promise<unknown>>>;
	visibilityState: string;
}

const fakePage = (controller: unknown, update = vi.fn(() => Promise.resolve())): FakePage => {
	const listeners = new Map<string, () => void>();
	const listen = (type: string, listener: () => void): void => {
		listeners.set(type, listener);
	};
	const container: WorkerContainer = {
		addEventListener: listen,
		controller,
		getRegistration: () => Promise.resolve({ update })
	};
	const page: FakePage = {
		container,
		document: {
			addEventListener: listen,
			get visibilityState() {
				return page.visibilityState;
			}
		},
		fire: (type) => listeners.get(type)?.(),
		reload: vi.fn(),
		update,
		visibilityState: 'visible'
	};
	return page;
};

describe('обновление приложения после деплоя', () => {
	it('новая версия взяла управление: страница перезагружается на неё', () => {
		const page = fakePage({});
		followWorkerUpdates(page);
		page.fire('controllerchange');
		expect(page.reload).toHaveBeenCalledOnce();
	});

	it('первая установка воркера страницу не перезагружает', () => {
		const page = fakePage(null);
		followWorkerUpdates(page);
		page.fire('controllerchange');
		expect(page.reload).not.toHaveBeenCalled();
	});

	it('возврат в приложение проверяет, нет ли новой версии; скрытое не проверяет', async () => {
		const page = fakePage({});
		followWorkerUpdates(page);
		page.fire('visibilitychange');
		await vi.waitFor(() => {
			expect(page.update).toHaveBeenCalledOnce();
		});
		page.visibilityState = 'hidden';
		page.fire('visibilitychange');
		expect(page.update).toHaveBeenCalledOnce();
	});

	it('без сети проверка молча откладывается до следующего возврата', async () => {
		const update = vi.fn(() => Promise.reject(new TypeError('Failed to fetch')));
		const page = fakePage({}, update);
		followWorkerUpdates(page);
		page.fire('visibilitychange');
		await vi.waitFor(() => {
			expect(update).toHaveBeenCalledOnce();
		});
	});

	it('без воркера в браузере ничего не делает', () => {
		expect(() => {
			followWorkerUpdates({ ...fakePage({}), container: undefined });
		}).not.toThrow();
	});
});
