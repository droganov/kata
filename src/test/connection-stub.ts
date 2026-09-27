import { vi } from 'vitest';

import type { Connection } from '../routes/connection.svelte.ts';

interface ConnectionStub extends Connection {
	isOffline: boolean;
	readonly sync: ReturnType<typeof vi.fn<Connection['sync']>>;
	unsent: number;
}

export const connectionStub: ConnectionStub = {
	isOffline: false,
	sync: vi.fn<Connection['sync']>(() => Promise.resolve()),
	unsent: 0
};

export const resetConnectionStub = (): void => {
	connectionStub.isOffline = false;
	connectionStub.unsent = 0;
	connectionStub.sync.mockClear();
};

export const goOffline = (unsent = 0): void => {
	connectionStub.isOffline = true;
	connectionStub.unsent = unsent;
};
