import { expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';

import Layout from './+layout.svelte';
import Page from './+page.svelte';

it('раскладка рендерит детей и favicon', async () => {
	const screen = await render(Layout, { children: Page as never });
	await expect.element(screen.getByRole('heading', { level: 1 })).toBeVisible();
	expect(document.querySelector('link[rel="icon"]')).not.toBeNull();
});
