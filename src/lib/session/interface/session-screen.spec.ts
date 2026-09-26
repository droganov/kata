import { afterEach, describe, expect, it, vi } from 'vitest';

import type { BrowserSession } from './browser-session.ts';

import { memoryStorage } from '../../../test/memory-storage.ts';
import { SESSION_START, SESSION_VIEW } from '../../../test/store-contract.ts';
import {
	closeDisclosure,
	disclosureKeyOf,
	openDisclosure,
	sessionItemAddress,
	sessionScreenOf
} from './session-screen.ts';

const STARTED: BrowserSession = {
	isHistoryWarningDue: false,
	session: {
		account: 'person-a',
		markedAt: SESSION_START.toISOString(),
		marks: [{ ord: 1, status: 'done' }],
		openedAt: SESSION_START.toISOString(),
		rejected: { exercises: [], targets: [] },
		view: SESSION_VIEW
	}
};

const screenAt = (address: string): ReturnType<typeof sessionScreenOf> =>
	sessionScreenOf(STARTED, new URLSearchParams(address));

describe('sessionScreenOf', () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('открывает Позицию и Блок, названные адресом', () => {
		vi.stubGlobal('sessionStorage', memoryStorage());
		const screen = screenAt('?item=3&block=block-warmup');
		expect([screen.current, screen.openedBlock]).toEqual([3, 'block-warmup']);
		expect(screen.session).toBe(STARTED.session);
	});

	it('без адреса открывает первую неотмеченную Позицию и ни одного Блока', () => {
		vi.stubGlobal('sessionStorage', memoryStorage());
		const screen = screenAt('');
		expect([screen.current, screen.openedBlock]).toEqual([2, undefined]);
	});

	it('не принимает за Позицию то, что не номер Позиции', () => {
		vi.stubGlobal('sessionStorage', memoryStorage());
		expect([screenAt('?item=abc').current, screenAt('?item=99').current]).toEqual([2, 2]);
	});

	it('помнит открытые раскрытия вкладки под ключом каждого элемента', () => {
		vi.stubGlobal('sessionStorage', memoryStorage());
		const equipment = disclosureKeyOf(STARTED.session, 2, 'equipment');
		const step = disclosureKeyOf(STARTED.session, 2, 'step-1');
		sessionStorage.setItem('training:active-session:person-a', '{}');
		openDisclosure(equipment);
		openDisclosure(step);
		closeDisclosure(step);
		expect(screenAt('').openDisclosures).toEqual([equipment]);
		expect(equipment).toBe('training:disclosure:7:2:equipment');
	});
});

describe('sessionItemAddress', () => {
	it('называет Позицию и открытый Блок латиницей', () => {
		expect(sessionItemAddress(2)).toBe('?item=2');
		expect(sessionItemAddress(2, 'block-warmup')).toBe('?item=2&block=block-warmup');
	});
});
