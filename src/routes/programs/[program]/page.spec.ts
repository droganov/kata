import { afterEach, describe, expect, it, vi } from 'vitest';

import { memoryStorage } from '../../../test/memory-storage.ts';
import { PROGRAM_CARD, serveSessionView } from '../../../test/session-fixtures.ts';
import { SESSION_VIEW } from '../../../test/store-contract.ts';
import { load } from './+page.ts';

describe('load /programs/[program] в браузере', () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('открывает Занятие выбранной Программы', async () => {
		vi.stubGlobal('sessionStorage', memoryStorage());
		const started = await load({ data: { program: PROGRAM_CARD }, fetch: serveSessionView });
		expect(started.view).toEqual(SESSION_VIEW);
	});

	it('уводит в Программу Активного занятия, когда оно начато в другой', async () => {
		vi.stubGlobal('sessionStorage', memoryStorage());
		await load({ data: { program: PROGRAM_CARD }, fetch: serveSessionView });
		await expect(
			load({
				data: { program: { ...PROGRAM_CARD, id: 'program-2' } },
				fetch: serveSessionView
			})
		).rejects.toMatchObject({ location: '/programs/program-1', status: 307 });
	});
});
