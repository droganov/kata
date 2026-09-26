import { goto } from '$app/navigation';
import { fireEvent, render, screen } from '@testing-library/svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { SessionView } from '../lib/session/application/session-views.ts';

import { createBrowserStore } from '../lib/session/infrastructure/browser-store.ts';
import { SESSION_VIEW } from '../test/store-contract.ts';
import Page from './+page.svelte';

vi.mock('$app/navigation', () => ({ goto: vi.fn() }));

const ACCOUNT = 'person-1';
const PROGRAMS = [
	{ account: ACCOUNT, id: 'program-1', title: 'Закрепления и добор' },
	{ account: ACCOUNT, id: 'program-2', title: 'Растяжка' }
];

const store = createBrowserStore({
	indexedDB: undefined,
	now: () => new Date('2026-09-26T08:00:00.000Z'),
	storage: sessionStorage
});

beforeEach(() => {
	sessionStorage.clear();
	vi.unstubAllGlobals();
	vi.mocked(goto).mockClear();
});

describe('список Программ', () => {
	it('показывает Программы ссылками на их Занятие', () => {
		render(Page, { data: { programs: PROGRAMS, redrawable: [] } });
		expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Программы');
		expect(screen.getByRole('link', { name: 'Закрепления и добор' })).toHaveAttribute(
			'href',
			'/programs/program-1'
		);
		expect(
			screen.queryByRole('button', { name: 'Пересобрать Занятие' })
		).not.toBeInTheDocument();
	});

	it('пересобирает Активное занятие Программы и ведёт в него', async () => {
		const fresh: SessionView = { ...SESSION_VIEW, seed: 8 };
		vi.stubGlobal('fetch', () => Promise.resolve(Response.json(fresh)));
		const session = await store.openSession(ACCOUNT, SESSION_VIEW);
		render(Page, { data: { programs: PROGRAMS, redrawable: [session] } });
		const buttons = screen.getAllByRole('button', { name: 'Пересобрать Занятие' });
		expect(buttons).toHaveLength(1);
		await fireEvent.click(buttons[0]!);
		await vi.waitFor(() => {
			expect(goto).toHaveBeenCalledWith('/programs/program-1', { invalidateAll: true });
		});
		const redrawn = await store.activeSession(ACCOUNT);
		expect(redrawn?.view.seed).toBe(8);
	});
});
