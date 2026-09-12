import { render, screen } from '@testing-library/svelte';
import { expect, it } from 'vitest';

import Page from './+page.svelte';

it('показывает Программы ссылками на их Занятие', () => {
	render(Page, { data: { programs: [{ id: 'program-1', title: 'Закрепления и добор' }] } });
	expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Программы');
	expect(screen.getByRole('link', { name: 'Закрепления и добор' })).toHaveAttribute(
		'href',
		'/programs/program-1'
	);
});
