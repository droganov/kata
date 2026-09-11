import { render, screen } from '@testing-library/svelte';
import { expect, it } from 'vitest';

import Page from './+page.svelte';

it('стартовая страница', () => {
	render(Page);
	expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Training');
});
