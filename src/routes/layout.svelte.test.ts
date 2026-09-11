import { render, screen } from '@testing-library/svelte';
import { expect, it } from 'vitest';

import Layout from './+layout.svelte';
import Page from './+page.svelte';

it('раскладка рендерит детей и favicon', () => {
	render(Layout, { children: Page as never });
	expect(screen.getByRole('heading', { level: 1 })).toBeVisible();
	expect(document.querySelector('link[rel="icon"]')).not.toBeNull();
});
