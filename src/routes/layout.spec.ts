import { expect, it } from 'vitest';

import { ssr } from './+layout.ts';

it('приложение остаётся клиентским: серверный рендер выключен', () => {
	expect(ssr).toBe(false);
});
