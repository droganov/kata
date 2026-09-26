import { goto, invalidateAll } from '$app/navigation';
import { fireEvent, render, screen } from '@testing-library/svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { SessionView } from '../lib/session/application/session-views.ts';

import { createBrowserStore } from '../lib/session/infrastructure/browser-store.ts';
import { SESSION_VIEW } from '../test/store-contract.ts';
import Page from './+page.svelte';

vi.mock('$app/navigation', () => ({ goto: vi.fn(), invalidateAll: vi.fn() }));

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
	vi.mocked(invalidateAll).mockClear();
});

describe('список Программ', () => {
	it('показывает Программы карточками, без Занятия предлагает начать', () => {
		render(Page, { data: { programs: PROGRAMS, sessions: [] } });
		expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Программы');
		expect(screen.getByRole('heading', { name: 'Закрепления и добор' })).toBeInTheDocument();
		expect(screen.getAllByRole('link', { name: 'Начать Занятие' })[0]).toHaveAttribute(
			'href',
			'/programs/program-1'
		);
		expect(screen.queryByRole('button', { name: 'Пересобрать' })).not.toBeInTheDocument();
	});

	it('у идущего Занятия показывает ход, продолжает и пересобирает его', async () => {
		const fresh: SessionView = { ...SESSION_VIEW, seed: 8 };
		vi.stubGlobal('fetch', () => Promise.resolve(Response.json(fresh)));
		const session = await store.openSession(ACCOUNT, SESSION_VIEW);
		render(Page, { data: { programs: PROGRAMS, sessions: [session] } });
		expect(screen.getByText('Занятие идёт · отмечено 0 из 3')).toBeInTheDocument();
		expect(screen.getByRole('link', { name: 'Продолжить' })).toHaveAttribute(
			'href',
			'/programs/program-1'
		);
		expect(screen.getAllByRole('link', { name: 'Начать Занятие' })).toHaveLength(1);
		await fireEvent.click(screen.getByRole('button', { name: 'Пересобрать' }));
		await vi.waitFor(() => {
			expect(goto).toHaveBeenCalledWith('/programs/program-1', { invalidateAll: true });
		});
		const redrawn = await store.activeSession(ACCOUNT);
		expect(redrawn?.view.seed).toBe(8);
	});

	it('отменяет идущее Занятие и перечитывает список', async () => {
		const session = await store.openSession(ACCOUNT, SESSION_VIEW);
		render(Page, { data: { programs: PROGRAMS, sessions: [session] } });
		await fireEvent.click(screen.getByRole('button', { name: 'Отменить Занятие' }));
		await vi.waitFor(() => {
			expect(invalidateAll).toHaveBeenCalled();
		});
		expect(await store.activeSession(ACCOUNT)).toBeUndefined();
	});

	it('не пересобирает Занятие, в котором уже есть Отметка', async () => {
		await store.openSession(ACCOUNT, SESSION_VIEW);
		const marked = await store.markExercise(ACCOUNT, { ord: 1, status: 'done' });
		render(Page, { data: { programs: PROGRAMS, sessions: [marked] } });
		expect(screen.getByText('Занятие идёт · отмечено 1 из 3')).toBeInTheDocument();
		expect(screen.queryByRole('button', { name: 'Пересобрать' })).not.toBeInTheDocument();
	});
});
