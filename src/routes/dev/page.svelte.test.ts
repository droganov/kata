import { fireEvent, render, screen } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';

import type { DevPageData } from './dev-page.ts';

import Page from './+page.svelte';

const DATA: DevPageData = {
	banks: [
		{
			slug: 'warmup',
			title: 'Разминка (банк)',
			zones: [
				{
					contours: [
						{
							exercises: [{ dose: '2×10', id: 'e1', name: 'Наклоны' }],
							id: 'c1',
							pick: 1,
							title: 'шейный отдел'
						},
						{ exercises: [], id: 'c2', title: 'без выбора' }
					],
					id: 'z1',
					title: 'Шея'
				}
			]
		}
	],
	exercises: {
		e1: {
			equipment: 'Тело — main',
			id: 'e1',
			name: 'Наклоны',
			note: 'медленно',
			prompt: 'PROMPT TEXT',
			steps: [
				{
					active: 'Шея',
					id: 's1',
					oracles: [
						{ counterModel: ['рывок'], id: 'o1', model: ['плавно'], predicate: 'темп' }
					],
					title: 'Наклон'
				}
			],
			targets: 'Шея — primary'
		},
		e2: { equipment: '', id: 'e2', name: 'Планка', steps: [], targets: '' }
	},
	program: { id: 'prog', title: 'Программа' },
	sections: [
		{
			base: [{ dose: '30с', id: 'e2', name: 'Планка' }],
			groups: [
				{
					id: 'slot-1',
					slots: [
						{
							allowRepeat: true,
							contourTitle: 'шейный отдел',
							exercises: [
								{ dose: '2×10', id: 'e1', name: 'Наклоны' },
								{ dose: '', id: 'ghost', name: 'ghost' }
							],
							id: 'slot-1',
							label: 'Шея',
							pick: 1,
							rule: 'без рывков'
						}
					],
					zone: { id: 'z1', title: 'Шея' }
				},
				{
					id: 'slot-2',
					slots: [
						{
							allowRepeat: false,
							exercises: [{ dose: '30с', id: 'e2', name: 'Планка' }],
							id: 'slot-2',
							label: 'Кор',
							pick: 1
						}
					]
				}
			],
			id: 'sec',
			mode: 'dynamic',
			slug: 'warmup',
			title: 'Разминка'
		}
	]
};

const one = (elements: HTMLElement[]): HTMLElement => {
	const [element] = elements;
	if (!element) throw new Error('элемент не найден');
	return element;
};

const first = (text: string): HTMLElement => one(screen.getAllByText(text));

describe('/dev', () => {
	it('показывает программу, секции, группы и банки', () => {
		render(Page, { data: DATA });
		expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Программа');
		expect(screen.getByText('1. Разминка')).toBeVisible();
		expect(first('Зона · Шея')).toBeVisible();
		expect(screen.getByText('ПУЛ · Кор — взять 1 из 1')).toBeVisible();
		expect(screen.getByText('Разминка (банк)')).toBeVisible();
		expect(screen.getByText('без выбора')).toBeInTheDocument();
	});

	it('раскрывает зону: контур, правило, повтор, упражнения', async () => {
		render(Page, { data: DATA });
		await fireEvent.click(first('Зона · Шея'));
		expect(screen.getByText('шейный отдел — взять 1 из 2')).toBeVisible();
		expect(screen.getByText('Правило: без рывков')).toBeVisible();
		expect(screen.getByText('повтор в ротации разрешён')).toBeVisible();
		await fireEvent.click(first('ghost'));
		expect(screen.getByText('упражнения нет в банках')).toBeVisible();
	});

	it('показывает процедуру: средства, цели, заметку, шаги и оракулы', async () => {
		render(Page, { data: DATA });
		await fireEvent.click(first('Зона · Шея'));
		await fireEvent.click(first('Наклоны'));
		expect(first('Средства: Тело — main')).toBeVisible();
		expect(first('Цели: Шея — primary')).toBeVisible();
		expect(first('Заметка: медленно')).toBeVisible();
		expect(first('Активны: Шея')).toBeVisible();
		expect(first('плавно')).toBeVisible();
		expect(first('рывок')).toBeVisible();
	});

	it('база без процедуры и промпта говорит об этом', async () => {
		render(Page, { data: DATA });
		await fireEvent.click(first('Планка'));
		expect(first('процедуры нет')).toBeVisible();
		await fireEvent.click(one(screen.getAllByLabelText('Промпт')));
		expect(first('промпта нет')).toBeVisible();
	});

	it('копирует промпт и сообщает об отказе буфера', async () => {
		const writeText = vi.spyOn(navigator.clipboard, 'writeText');
		writeText.mockResolvedValueOnce();
		render(Page, { data: DATA });
		await fireEvent.click(first('Зона · Шея'));
		await fireEvent.click(first('Наклоны'));
		await fireEvent.click(one(screen.getAllByLabelText('Промпт')));
		expect(first('PROMPT TEXT')).toBeVisible();
		await fireEvent.click(one(screen.getAllByRole('button', { name: 'Копировать' })));
		expect(writeText).toHaveBeenCalledWith('PROMPT TEXT');
		expect(await screen.findByRole('button', { name: 'Скопировано' })).toBeVisible();
		writeText.mockRejectedValueOnce(new Error('denied'));
		await fireEvent.click(screen.getByRole('button', { name: 'Скопировано' }));
		expect(await screen.findByRole('button', { name: 'Не скопировано' })).toBeVisible();
	});
});
