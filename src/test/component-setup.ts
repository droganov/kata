import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/svelte';
import { afterEach, vi } from 'vitest';

import '../routes/layout.css';
import { connectionStub, resetConnectionStub } from './connection-stub.ts';

const CLIPBOARD = 'clipboard';
const EMPTY_TEXT = '';

const clipboardStub = {
	readText: vi.fn(() => Promise.resolve(EMPTY_TEXT)),
	writeText: vi.fn(() => Promise.resolve())
};

Object.defineProperty(navigator, CLIPBOARD, {
	configurable: true,
	value: clipboardStub,
	writable: true
});

vi.mock(import('../routes/connection.svelte.ts'), async (original) => ({
	...(await original()),
	browserConnection: connectionStub
}));

afterEach(() => {
	cleanup();
	vi.restoreAllMocks();
	resetConnectionStub();
});
