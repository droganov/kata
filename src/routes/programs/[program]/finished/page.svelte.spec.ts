import { render, screen } from '@testing-library/svelte';
import { expect, it } from 'vitest';

import Page from './+page.svelte';

it('говорит, что Занятие завершено, и ведёт к списку Программ', () => {
	render(Page);
	expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Занятие завершено');
	expect(screen.getByRole('link', { name: 'К Программам' })).toHaveAttribute('href', '/');
});
