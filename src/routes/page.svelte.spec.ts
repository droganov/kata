import { goto, invalidateAll } from '$app/navigation';
import { fireEvent, render, screen } from '@testing-library/svelte';
import { IDBFactory } from 'fake-indexeddb';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { SessionView } from '../lib/session/application/session-views.ts';

import {
	otherBrowserAccounts,
	signedInBrowserAccount
} from '../lib/account/interface/browser-account.ts';
import { createBrowserStore } from '../lib/session/infrastructure/browser-store.ts';
import { serveNoContent, SIGNED_IN, signedInBrowserAs } from '../test/account-fixtures.ts';
import { SESSION_VIEW } from '../test/store-contract.ts';
import Page from './+page.svelte';

vi.mock('$app/navigation', () => ({ goto: vi.fn(), invalidateAll: vi.fn() }));

const ACCOUNT = 'person-1';
const PROGRAMS = [
	{ id: 'program-1', title: 'Закрепления и добор' },
	{ id: 'program-2', title: 'Растяжка' }
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
		render(Page, {
			data: { accounts: [], programs: PROGRAMS, sessions: [], signedIn: SIGNED_IN }
		});
		expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Программы');
		expect(screen.getByRole('heading', { name: 'Закрепления и добор' })).toBeInTheDocument();
		expect(screen.getAllByRole('link', { name: 'Начать Занятие' })[0]).toHaveAttribute(
			'href',
			'/programs/program-1'
		);
		expect(screen.queryByRole('button', { name: 'Пересобрать' })).not.toBeInTheDocument();
		expect(screen.getByRole('link', { name: 'Sergei' })).toHaveAttribute('href', '/account');
	});

	it('без Сеанса вместо Программ показывает форму Входа', () => {
		render(Page, { data: { signedIn: undefined } });
		expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Вход');
		expect(screen.queryByText('Закрепления и добор')).not.toBeInTheDocument();
	});

	it('у идущего Занятия показывает ход, продолжает и пересобирает его', async () => {
		const fresh: SessionView = { ...SESSION_VIEW, seed: 8 };
		vi.stubGlobal('fetch', () => Promise.resolve(Response.json(fresh)));
		const session = await store.openSession(ACCOUNT, SESSION_VIEW);
		render(Page, {
			data: { accounts: [], programs: PROGRAMS, sessions: [session], signedIn: SIGNED_IN }
		});
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
		render(Page, {
			data: { accounts: [], programs: PROGRAMS, sessions: [session], signedIn: SIGNED_IN }
		});
		await fireEvent.click(screen.getByRole('button', { name: 'Отменить Занятие' }));
		await vi.waitFor(() => {
			expect(invalidateAll).toHaveBeenCalled();
		});
		expect(await store.activeSession(ACCOUNT)).toBeUndefined();
	});

	it('не пересобирает Занятие, в котором уже есть Отметка', async () => {
		await store.openSession(ACCOUNT, SESSION_VIEW);
		const marked = await store.markExercise(ACCOUNT, { ord: 1, status: 'done' });
		render(Page, {
			data: { accounts: [], programs: PROGRAMS, sessions: [marked], signedIn: SIGNED_IN }
		});
		expect(screen.getByText('Занятие идёт · отмечено 1 из 3')).toBeInTheDocument();
		expect(screen.queryByRole('button', { name: 'Пересобрать' })).not.toBeInTheDocument();
	});
});

describe('меню по аватару', () => {
	beforeEach(() => {
		vi.stubGlobal('indexedDB', new IDBFactory());
		vi.stubGlobal('fetch', serveNoContent);
	});

	it('показывает текущего и всех, кто входил на устройстве', async () => {
		await signedInBrowserAs('Anna', 'anna@example.com');
		const sergei = await signedInBrowserAs('Sergei', 'sergei@example.com');
		const accounts = await otherBrowserAccounts(sergei);
		render(Page, { data: { accounts, programs: PROGRAMS, sessions: [], signedIn: sergei } });
		expect(screen.getByLabelText('Меню Аккаунта')).toHaveTextContent('S');
		expect(screen.getByRole('link', { name: 'Sergei' })).toHaveAttribute('href', '/account');
		expect(screen.getByRole('button', { name: 'Переключиться на Anna' })).toBeInTheDocument();
		expect(
			screen.queryByRole('button', { name: 'Переключиться на Sergei' })
		).not.toBeInTheDocument();
	});

	it('переключается на другой Аккаунт по ключу и закрывает Сеанс текущего', async () => {
		const anna = await signedInBrowserAs('Anna', 'anna@example.com');
		const sergei = await signedInBrowserAs('Sergei', 'sergei@example.com');
		const accounts = await otherBrowserAccounts(sergei);
		render(Page, { data: { accounts, programs: PROGRAMS, sessions: [], signedIn: sergei } });
		await fireEvent.click(screen.getByRole('button', { name: 'Переключиться на Anna' }));
		await vi.waitFor(() => {
			expect(invalidateAll).toHaveBeenCalled();
		});
		expect(await signedInBrowserAccount(sergei.authSession.id)).toBeUndefined();
		expect(await signedInBrowserAccount(anna.authSession.id)).toBeDefined();
	});

	it('без подтверждения ключом остаётся в текущем Аккаунте и говорит об этом', async () => {
		const sergei = await signedInBrowserAs('Sergei', 'sergei@example.com');
		const keyless = {
			account: '01a0e029-5400-7000-8000-00000000000a',
			key: 'key-keyless',
			nickname: 'Anna',
			signedInAt: '2026-09-27T08:00:00.000Z'
		};
		render(Page, {
			data: { accounts: [keyless], programs: PROGRAMS, sessions: [], signedIn: sergei }
		});
		await fireEvent.click(screen.getByRole('button', { name: 'Переключиться на Anna' }));
		expect(await screen.findByRole('alert')).toHaveTextContent(
			'Ключ не подтвердил переключение.'
		);
		expect(invalidateAll).not.toHaveBeenCalled();
		expect(await signedInBrowserAccount(sergei.authSession.id)).toBeDefined();
	});

	it('убирает запись из списка, Аккаунт остаётся', async () => {
		const anna = await signedInBrowserAs('Anna', 'anna@example.com');
		const sergei = await signedInBrowserAs('Sergei', 'sergei@example.com');
		const accounts = await otherBrowserAccounts(sergei);
		render(Page, { data: { accounts, programs: PROGRAMS, sessions: [], signedIn: sergei } });
		await fireEvent.click(screen.getByRole('button', { name: 'Убрать Anna из списка' }));
		await vi.waitFor(() => {
			expect(invalidateAll).toHaveBeenCalled();
		});
		expect(await otherBrowserAccounts(sergei)).toEqual([]);
		expect(await signedInBrowserAccount(anna.authSession.id)).toBeDefined();
	});

	it('для входа в другой Аккаунт выходит из текущего', async () => {
		const sergei = await signedInBrowserAs('Sergei', 'sergei@example.com');
		render(Page, {
			data: { accounts: [], programs: PROGRAMS, sessions: [], signedIn: sergei }
		});
		await fireEvent.click(screen.getByRole('button', { name: 'Войти в другой Аккаунт' }));
		await vi.waitFor(() => {
			expect(invalidateAll).toHaveBeenCalled();
		});
		expect(await signedInBrowserAccount(sergei.authSession.id)).toBeUndefined();
	});
});
