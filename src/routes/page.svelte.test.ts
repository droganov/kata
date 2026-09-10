import { expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';

import Page from './+page.svelte';

it('стартовая страница', async () => {
	const screen = await render(Page);
	await expect.element(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Training');
});
