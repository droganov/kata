import { invalidateAll } from '$app/navigation';
import { fireEvent, render, screen } from '@testing-library/svelte';
import { IDBFactory } from 'fake-indexeddb';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { SignedIn } from '../../lib/account/interface/browser-account.ts';

import {
	browserAuthSessions,
	requestBrowserEmailCode,
	signedInBrowserAccount,
	signInBrowser
} from '../../lib/account/interface/browser-account.ts';
import { serveNoContent } from '../../test/account-fixtures.ts';
import Page from './+page.svelte';

vi.mock('$app/navigation', () => ({ invalidateAll: vi.fn() }));

const signInTimes = async (times: number): Promise<SignedIn> => {
	const person = await requestBrowserEmailCode('Sergei', 'sergei@example.com');
	const first = await signInBrowser(person, '0', serveNoContent);
	for (let index = 1; index < times; index += 1) {
		await requestBrowserEmailCode('Sergei', 'sergei@example.com');
		await signInBrowser(person, '0', serveNoContent);
	}
	return (await signedInBrowserAccount(first!.id))!;
};

const renderFor = async (signedIn: SignedIn): Promise<void> => {
	render(Page, {
		data: { authSessions: await browserAuthSessions(signedIn.account.id), signedIn }
	});
};

describe('экран Аккаунта', () => {
	beforeEach(() => {
		vi.stubGlobal('indexedDB', new IDBFactory());
		vi.stubGlobal('fetch', vi.fn(serveNoContent));
		vi.mocked(invalidateAll).mockClear();
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('показывает Аккаунт и список Сеансов, текущий помечен', async () => {
		const signedIn = await signInTimes(2);
		await renderFor(signedIn);
		expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Аккаунт');
		expect(screen.getByText('sergei@example.com')).toBeInTheDocument();
		expect(screen.getAllByRole('listitem')).toHaveLength(2);
		expect(screen.getAllByText('это устройство')).toHaveLength(1);
	});

	it('гасит Сеанс по отдельности и перечитывает экран', async () => {
		const signedIn = await signInTimes(2);
		await renderFor(signedIn);
		const [first] = screen.getAllByRole('button', { name: 'Погасить' });
		await fireEvent.click(first!);
		await vi.waitFor(() => {
			expect(invalidateAll).toHaveBeenCalled();
		});
		expect(await browserAuthSessions(signedIn.account.id)).toHaveLength(1);
	});

	it('гасит все Сеансы кроме текущего', async () => {
		const signedIn = await signInTimes(3);
		await renderFor(signedIn);
		await fireEvent.click(screen.getByRole('button', { name: 'Погасить все, кроме текущего' }));
		await vi.waitFor(() => {
			expect(invalidateAll).toHaveBeenCalled();
		});
		const sessions = await browserAuthSessions(signedIn.account.id);
		expect(sessions.map((session) => session.id)).toEqual([signedIn.authSession.id]);
	});

	it('с одним Сеансом не предлагает гасить остальные', async () => {
		await renderFor(await signInTimes(1));
		expect(
			screen.queryByRole('button', { name: 'Погасить все, кроме текущего' })
		).not.toBeInTheDocument();
	});
});
