import { IDBFactory } from 'fake-indexeddb';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { SignedIn } from '../lib/account/interface/browser-account.ts';
import type { LayoutData } from './+layout.ts';

import {
	forgetBrowserAccount,
	otherBrowserAccounts,
	signedInBrowserAccount,
	switchBrowserAccount
} from '../lib/account/interface/browser-account.ts';
import { HISTORY_DAYS } from '../lib/session/application/store.ts';
import { createBrowserStore } from '../lib/session/infrastructure/browser-store.ts';
import {
	cancelBrowserSession,
	markBrowserSession,
	startBrowserSession
} from '../lib/session/interface/browser-session.ts';
import {
	serveNoContent,
	SIGNED_IN,
	signedInBrowserAs,
	signedInLayout
} from '../test/account-fixtures.ts';
import { memoryStorage } from '../test/memory-storage.ts';
import { ACCOUNT, PROGRAM_CARD, serveSessionView } from '../test/session-fixtures.ts';
import { load } from './+page.ts';

const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Version/18.0 Safari/604.1';

const layoutOf = (signedIn: SignedIn) => (): Promise<LayoutData> =>
	Promise.resolve({ hasExpiredSession: false, signedIn });

describe('load / в браузере', () => {
	beforeEach(() => {
		vi.stubGlobal('indexedDB', new IDBFactory());
		vi.stubGlobal('navigator', { userAgent: IPHONE });
		vi.stubGlobal('sessionStorage', memoryStorage());
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('отдаёт вошедший Аккаунт, Программы и Активное занятие Аккаунта', async () => {
		const programs = [PROGRAM_CARD];
		expect(await load({ data: { programs }, parent: signedInLayout })).toEqual({
			accounts: [],
			programs,
			sessions: [],
			signedIn: SIGNED_IN
		});
		const { session } = await startBrowserSession(ACCOUNT, PROGRAM_CARD, serveSessionView);
		expect(await load({ data: { programs }, parent: signedInLayout })).toEqual({
			accounts: [],
			programs,
			sessions: [session],
			signedIn: SIGNED_IN
		});
	});

	it('отдаёт других, кто входил на устройстве', async () => {
		const anna = await signedInBrowserAs('Anna', 'anna@example.com');
		const sergei = await signedInBrowserAs('Sergei', 'sergei@example.com');
		const found = await load({ data: { programs: [] }, parent: layoutOf(sergei) });
		expect(found).toMatchObject({
			accounts: [{ account: anna.account.id, nickname: 'Anna' }],
			signedIn: sergei
		});
	});

	it('после переключения не показывает чужое Активное занятие, а своё возвращает', async () => {
		const programs = [PROGRAM_CARD];
		await signedInBrowserAs('Anna', 'anna@example.com');
		const sergei = await signedInBrowserAs('Sergei', 'sergei@example.com');
		const { session } = await startBrowserSession(
			sergei.account.id,
			PROGRAM_CARD,
			serveSessionView
		);
		const [annaEntry] = await otherBrowserAccounts(sergei);
		const switched = await switchBrowserAccount(sergei, annaEntry!, serveNoContent);
		const asAnna = await signedInBrowserAccount(switched?.id ?? null);
		expect(await load({ data: { programs }, parent: layoutOf(asAnna!) })).toMatchObject({
			sessions: []
		});
		const [back] = await otherBrowserAccounts(asAnna!);
		const returned = await switchBrowserAccount(asAnna!, back!, serveNoContent);
		const asSergei = await signedInBrowserAccount(returned?.id ?? null);
		expect(await load({ data: { programs }, parent: layoutOf(asSergei!) })).toMatchObject({
			sessions: [session]
		});
	});

	it('История принадлежит Аккаунту и возвращается после удаления записи и повторного входа', async () => {
		const history = createBrowserStore({
			indexedDB,
			now: () => new Date(),
			storage: sessionStorage
		});
		await signedInBrowserAs('Anna', 'anna@example.com');
		const sergei = await signedInBrowserAs('Sergei', 'sergei@example.com');
		const { session } = await startBrowserSession(
			sergei.account.id,
			PROGRAM_CARD,
			serveSessionView
		);
		const [first] = session.view.blocks.flatMap((block) => block.items);
		await markBrowserSession(sergei.account.id, { ord: first!.ord, status: 'done' });
		await cancelBrowserSession(sergei.account.id);
		const done = await history.recentExercises(sergei.account.id, HISTORY_DAYS);
		expect(done.map((entry) => entry.exercise)).toEqual([first!.exercise]);
		const [annaEntry] = await otherBrowserAccounts(sergei);
		const switched = await switchBrowserAccount(sergei, annaEntry!, serveNoContent);
		const anna = await signedInBrowserAccount(switched?.id ?? null);
		expect(await history.recentExercises(anna!.account.id, HISTORY_DAYS)).toEqual([]);
		await forgetBrowserAccount(sergei.account.id);
		expect(await otherBrowserAccounts(anna!)).toEqual([]);
		const again = await signedInBrowserAs('Sergei', 'sergei@example.com');
		expect(again.account.id).toBe(sergei.account.id);
		expect(await history.recentExercises(sergei.account.id, HISTORY_DAYS)).toEqual(done);
	});

	it('без Сеанса Программы Аккаунта не читает', async () => {
		const parent = (): Promise<LayoutData> =>
			Promise.resolve({ hasExpiredSession: false, signedIn: undefined });
		expect(await load({ data: { programs: [PROGRAM_CARD] }, parent })).toEqual({
			signedIn: undefined
		});
	});
});
