import { render, screen } from '@testing-library/svelte';
import { expect, it } from 'vitest';

import Page from './+page.svelte';

const DATA = {
	blocks: [
		{ id: 'b-cardio', items: [], name: 'Разогрев' },
		{
			id: 'b-warmup',
			items: [
				{ dose: '2×10', name: 'Круги головой', ord: 1 },
				{ dose: '40с × 2', name: 'Наклоны головы', ord: 2 }
			],
			name: 'Разминка'
		}
	],
	title: 'Закрепления и добор'
};

it('показывает Занятие по Блокам с названием и Дозой каждого Упражнения', () => {
	render(Page, { data: DATA });
	expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Закрепления и добор');
	expect(
		screen.getAllByRole('heading', { level: 2 }).map((heading) => heading.textContent)
	).toEqual(['Разогрев', 'Разминка']);
	expect(screen.getByText('Упражнений нет')).toBeInTheDocument();
	expect(
		screen.getAllByRole('listitem').map((row) => row.textContent.replaceAll(/\s+/g, ' ').trim())
	).toEqual(['Круги головой 2×10', 'Наклоны головы 40с × 2']);
});
