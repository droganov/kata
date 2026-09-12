import { render, screen } from '@testing-library/svelte';
import { expect, it } from 'vitest';

import Page from './+page.svelte';

const DATA = {
	blocks: [
		{ id: 'b-cardio', items: [], name: 'Разогрев' },
		{
			id: 'b-warmup',
			items: [
				{
					detail: {
						equipment: 'Тело — main',
						note: 'медленно',
						steps: [
							{
								active: 'Шея',
								id: 's1',
								oracles: [
									{
										counterModel: ['рывок'],
										id: 'o1',
										model: ['плавно'],
										predicate: 'Плечи опущены'
									}
								],
								title: 'Наклон'
							}
						],
						targets: 'Шея — primary'
					},
					dose: '2×10',
					name: 'Круги головой',
					ord: 1
				},
				{
					detail: { equipment: '', steps: [], targets: '' },
					dose: '40с × 2',
					name: 'Наклоны головы',
					ord: 2
				}
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
	expect(screen.getByText('Круги головой')).toBeInTheDocument();
	expect(screen.getByText('40с × 2')).toBeInTheDocument();
});

it('раскрывает Упражнение процедурой с оракулами, оборудованием, Мишенями и заметкой', () => {
	render(Page, { data: DATA });
	expect(screen.getByText('Оборудование: Тело — main')).toBeInTheDocument();
	expect(screen.getByText('Мишени: Шея — primary')).toBeInTheDocument();
	expect(screen.getByText('Заметка: медленно')).toBeInTheDocument();
	expect(screen.getByText('Наклон')).toBeInTheDocument();
	expect(screen.getByText('Плечи опущены')).toBeInTheDocument();
	expect(screen.getByText('плавно')).toBeInTheDocument();
	expect(screen.getByText('рывок')).toBeInTheDocument();
	expect(screen.getByText('Процедуры нет')).toBeInTheDocument();
});
