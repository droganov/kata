import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';

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

describe('/dev', () => {
	it('показывает программу, секции, группы и банки', async () => {
		const screen = await render(Page, { data: DATA });
		await expect
			.element(screen.getByRole('heading', { level: 1 }))
			.toHaveTextContent('Программа');
		await expect.element(page.getByText('1. Разминка')).toBeVisible();
		await expect.element(page.getByText('Зона · Шея').first()).toBeVisible();
		await expect.element(page.getByText('ПУЛ · Кор — взять 1 из 1')).toBeVisible();
		await expect.element(page.getByText('Разминка (банк)')).toBeVisible();
		await expect.element(page.getByText('без выбора')).toBeInTheDocument();
	});

	it('раскрывает зону: контур, правило, повтор, упражнения', async () => {
		await render(Page, { data: DATA });
		await page.getByText('Зона · Шея').first().click();
		await expect.element(page.getByText('шейный отдел — взять 1 из 2')).toBeVisible();
		await expect.element(page.getByText('Правило: без рывков')).toBeVisible();
		await expect.element(page.getByText('повтор в ротации разрешён')).toBeVisible();
		await page.getByText('ghost').click();
		await expect.element(page.getByText('упражнения нет в банках')).toBeVisible();
	});

	it('показывает процедуру: средства, цели, заметку, шаги и оракулы', async () => {
		await render(Page, { data: DATA });
		await page.getByText('Зона · Шея').first().click();
		await page.getByText('Наклоны').first().click();
		await expect.element(page.getByText('Средства: Тело — main').first()).toBeVisible();
		await expect.element(page.getByText('Цели: Шея — primary').first()).toBeVisible();
		await expect.element(page.getByText('Заметка: медленно').first()).toBeVisible();
		await expect.element(page.getByText('Активны: Шея').first()).toBeVisible();
		await expect.element(page.getByText('плавно').first()).toBeVisible();
		await expect.element(page.getByText('рывок').first()).toBeVisible();
	});

	it('база без процедуры и промпта говорит об этом', async () => {
		await render(Page, { data: DATA });
		await page.getByText('Планка').first().click();
		await expect.element(page.getByText('процедуры нет').first()).toBeVisible();
		await page.getByLabelText('Промпт').first().click();
		await expect.element(page.getByText('промпта нет').first()).toBeVisible();
	});

	it('копирует промпт и сообщает об отказе буфера', async () => {
		const writeText = vi.spyOn(navigator.clipboard, 'writeText');
		writeText.mockResolvedValueOnce();
		await render(Page, { data: DATA });
		await page.getByText('Зона · Шея').first().click();
		await page.getByText('Наклоны').first().click();
		await page.getByLabelText('Промпт').first().click();
		await expect.element(page.getByText('PROMPT TEXT').first()).toBeVisible();
		const button = page.getByRole('button', { name: 'Копировать' }).first();
		await button.click();
		expect(writeText).toHaveBeenCalledWith('PROMPT TEXT');
		await expect.element(page.getByRole('button', { name: 'Скопировано' })).toBeVisible();
		writeText.mockRejectedValueOnce(new Error('denied'));
		await page.getByRole('button', { name: 'Скопировано' }).click();
		await expect.element(page.getByRole('button', { name: 'Не скопировано' })).toBeVisible();
		writeText.mockRestore();
	});
});
