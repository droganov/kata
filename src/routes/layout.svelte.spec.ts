import { render, screen } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import { expect, it } from 'vitest';

const HEADING = '<h1>Тренировка</h1>';

import Layout from './+layout.svelte';

it('раскладка рендерит детей и favicon', () => {
	const children = createRawSnippet(() => ({ render: () => HEADING }));
	render(Layout, { children });
	expect(screen.getByRole('heading', { level: 1 })).toBeVisible();
	expect(document.querySelector('link[rel="icon"]')).not.toBeNull();
});
