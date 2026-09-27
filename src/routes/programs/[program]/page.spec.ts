import { afterEach, describe, expect, it, vi } from 'vitest';

import { SIGNED_IN, signedInLayout } from '../../../test/account-fixtures.ts';
import { memoryStorage } from '../../../test/memory-storage.ts';
import { PROGRAM_CARD, serveSessionView } from '../../../test/session-fixtures.ts';
import { SESSION_VIEW } from '../../../test/store-contract.ts';
import { load } from './+page.ts';

const parent = signedInLayout;
const depends = (): void => undefined;

const urlOf = (search: string): URL => new URL(`http://localhost/programs/program-1${search}`);

describe('load /programs/[program] в браузере', () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('открывает Занятие выбранной Программы', async () => {
		vi.stubGlobal('sessionStorage', memoryStorage());
		const started = await load({
			data: { program: PROGRAM_CARD },
			depends,
			fetch: serveSessionView,
			parent,
			url: urlOf('')
		});
		expect(started).toMatchObject({ session: { view: SESSION_VIEW }, signedIn: SIGNED_IN });
	});

	it('открывает Позицию и Блок из адреса', async () => {
		vi.stubGlobal('sessionStorage', memoryStorage());
		const screen = await load({
			data: { program: PROGRAM_CARD },
			depends,
			fetch: serveSessionView,
			parent,
			url: urlOf('?item=3&block=block-strength')
		});
		expect(screen).toMatchObject({ current: 3, openedBlock: 'block-strength' });
	});

	it('уводит в Программу Активного занятия, когда оно начато в другой', async () => {
		vi.stubGlobal('sessionStorage', memoryStorage());
		await load({
			data: { program: PROGRAM_CARD },
			depends,
			fetch: serveSessionView,
			parent,
			url: urlOf('')
		});
		await expect(
			load({
				data: { program: { ...PROGRAM_CARD, id: 'program-2' } },
				depends,
				fetch: serveSessionView,
				parent,
				url: urlOf('')
			})
		).rejects.toMatchObject({ location: '/programs/program-1', status: 307 });
	});

	it('без Сеанса Занятие не открывает', async () => {
		vi.stubGlobal('sessionStorage', memoryStorage());
		const fetch = vi.fn(serveSessionView);
		const page = await load({
			data: { program: PROGRAM_CARD },
			depends,
			fetch,
			parent: () => Promise.resolve({ hasExpiredSession: false, signedIn: undefined }),
			url: urlOf('')
		});
		expect(page).toEqual({ signedIn: undefined });
		expect(fetch).not.toHaveBeenCalled();
	});

	it('открывает Занятие только после того, как раскладка финализировала истёкшее', async () => {
		vi.stubGlobal('sessionStorage', memoryStorage());
		const order: string[] = [];
		await load({
			data: { program: PROGRAM_CARD },
			depends,
			fetch: () => {
				order.push('сборка');
				return serveSessionView();
			},
			parent: () => {
				order.push('раскладка');
				return signedInLayout();
			},
			url: urlOf('')
		});
		expect(order).toEqual(['раскладка', 'сборка']);
	});

	it('зависит от Занятия: Отметка перезапускает загрузку без обращения к серверу', async () => {
		vi.stubGlobal('sessionStorage', memoryStorage());
		const declared = vi.fn();
		await load({
			data: { program: PROGRAM_CARD },
			depends: declared,
			fetch: serveSessionView,
			parent,
			url: urlOf('')
		});
		expect(declared).toHaveBeenCalledWith('training:session');
	});
});
