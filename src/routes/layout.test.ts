import { expect, it } from 'vitest';

import { prerender, ssr } from './+layout';

it('чистое SPA: без SSR и пререндера', () => {
	expect(ssr).toBe(false);
	expect(prerender).toBe(false);
});
