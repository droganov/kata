import { afterEach, describe, expect, it, vi } from 'vitest';

import { memoryStorage } from '../../../test/memory-storage.ts';
import { PROGRAM_CARD, serveSessionView } from '../../../test/session-fixtures.ts';
import { SESSION_VIEW } from '../../../test/store-contract.ts';
import { load } from './+page.ts';

const parent = (): Promise<{ readonly hasExpiredSession: boolean }> =>
	Promise.resolve({ hasExpiredSession: false });

const urlOf = (search: string): URL => new URL(`http://localhost/programs/program-1${search}`);

describe('load /programs/[program] в браузере', () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('открывает Занятие выбранной Программы', async () => {
		vi.stubGlobal('sessionStorage', memoryStorage());
		const started = await load({
			data: { program: PROGRAM_CARD },
			fetch: serveSessionView,
			parent,
			url: urlOf('')
		});
		expect(started.session.view).toEqual(SESSION_VIEW);
	});

	it('открывает Позицию и Блок из адреса', async () => {
		vi.stubGlobal('sessionStorage', memoryStorage());
		const screen = await load({
			data: { program: PROGRAM_CARD },
			fetch: serveSessionView,
			parent,
			url: urlOf('?item=3&block=block-strength')
		});
		expect([screen.current, screen.openedBlock]).toEqual([3, 'block-strength']);
	});

	it('уводит в Программу Активного занятия, когда оно начато в другой', async () => {
		vi.stubGlobal('sessionStorage', memoryStorage());
		await load({
			data: { program: PROGRAM_CARD },
			fetch: serveSessionView,
			parent,
			url: urlOf('')
		});
		await expect(
			load({
				data: { program: { ...PROGRAM_CARD, id: 'program-2' } },
				fetch: serveSessionView,
				parent,
				url: urlOf('')
			})
		).rejects.toMatchObject({ location: '/programs/program-1', status: 307 });
	});

	it('открывает Занятие только после того, как раскладка финализировала истёкшее', async () => {
		vi.stubGlobal('sessionStorage', memoryStorage());
		const order: string[] = [];
		await load({
			data: { program: PROGRAM_CARD },
			fetch: () => {
				order.push('сборка');
				return serveSessionView();
			},
			parent: () => {
				order.push('раскладка');
				return Promise.resolve({ hasExpiredSession: false });
			},
			url: urlOf('')
		});
		expect(order).toEqual(['раскладка', 'сборка']);
	});
});
