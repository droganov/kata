import type { Bank, Day, Exercise } from '$lib/domain/model';

import { beforeEach, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';

import Page from './+page.svelte';

const procedure = {
	steps: [
		{
			active: [],
			oracles: [
				{
					counterModel: ['живот выпирает'],
					model: ['стопы на полу'],
					predicate: 'Обе седалищные кости лежат на скамье'
				}
			],
			title: 'Сесть на скамью'
		},
		{
			active: ['tr_up'],
			oracles: [
				{
					counterModel: ['онемение'],
					model: ['корпус вертикален'],
					predicate: 'Ухо у плеча'
				}
			],
			title: 'Удержать 30 секунд'
		}
	]
};
const ex = (id: string, origin: 'base' | 'pool', axis: string, slot?: string): Exercise => ({
	axis,
	id,
	name: `Упр ${id}`,
	origin,
	...(slot !== undefined && { slot }),
	dose: '2×8',
	equipment: [{ id: 'body', role: 'главное' }],
	mode: 'dynamic',
	procedure,
	targets: [{ id: 'tr_up', role: 'основная' }]
});
const days: Day[] = [
	{
		axes: [
			{
				id: 'warmup',
				slots: [
					{
						id: 'W_cervical',
						items: [
							{
								dose: '8',
								id: 'neck_rot',
								images: [],
								instructions: '',
								name: 'Повороты'
							}
						],
						kind: 'pool',
						label: 'Шея · шейный отдел',
						unit: 'контур',
						zone: 'Шея'
					},
					{
						id: 'K',
						items: [
							{ dose: '3×10', id: 'k1', images: [], instructions: '', name: 'K1' }
						],
						kind: 'pool',
						label: 'Колено'
					}
				],
				title: 'Разминка'
			},
			{
				id: 'strength',
				slots: [{ id: 'BASE', items: [], kind: 'base', label: 'БАЗА' }],
				title: 'Силовой'
			},
			{
				id: 'stretch',
				slots: [{ id: 'BASE', items: [], kind: 'base', label: 'БАЗА' }],
				title: 'Растяжка'
			}
		],
		id: 'w1d1',
		index: 1,
		minutes: 60,
		title: 'День 1'
	}
];
const stretch: Bank = {
	excluded: [],
	zones: [
		{
			contours: [
				{
					bank: [
						{
							dose: '2×30с/сторона',
							equipment: [{ id: 'body', role: 'главное' }],
							id: 'st_tr_upper',
							name: 'Наклон головы',
							procedure,
							targets: [{ id: 'tr_up', role: 'основная' }]
						},
						{ dose: '1', id: 'st_no_proc', name: 'Без процедуры' }
					],
					id: 'tr_upper',
					title: 'верхняя трапеция'
				}
			],
			id: 'trap',
			title: 'Трапеция'
		}
	]
};
const data = {
	banks: { static: null, strength: null, stretch },
	days,
	equipment: [{ id: 'body', name: 'Тело' }],
	exercises: [
		ex('neck_rot', 'pool', 'warmup', 'W_cervical'),
		ex('k1', 'pool', 'warmup', 'K'),
		ex('glute_bridge_m', 'base', 'strength')
	],
	prompts: {
		'plan:neck_rot': 'STORYBOARD — Повороты',
		'stretch:st_tr_upper': 'STORYBOARD — Наклон головы'
	},
	targets: [{ id: 'tr_up', name: 'Трапеция верхняя' }]
};

beforeEach(() => {
	sessionStorage.clear();
	vi.restoreAllMocks();
});

it('разминка: зона → контур → упражнение → вкладки Процедура | Промпт', async () => {
	const writeText = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValueOnce(undefined);
	const screen = await render(Page, { data } as never);
	await screen.getByText('Зона · Шея', { exact: false }).click();
	await screen.getByText('Упр neck_rot').click();
	await expect.element(screen.getByText('Активны: —')).toBeVisible();
	await expect.element(screen.getByText('Активны: Трапеция верхняя')).toBeVisible();
	await screen.getByRole('tab', { name: 'Промпт' }).click();
	await expect.element(screen.getByText('STORYBOARD — Повороты')).toBeVisible();
	await screen.getByRole('button', { name: 'Копировать' }).click();
	await expect.element(screen.getByRole('button', { name: 'Скопировано' })).toBeVisible();
	expect(writeText).toHaveBeenCalledWith('STORYBOARD — Повороты');
	await expect
		.element(screen.getByRole('button', { name: 'Копировать' }), { timeout: 3000 })
		.toBeVisible();
	await screen.getByRole('tab', { name: 'Процедура' }).click();
	await expect.element(screen.getByText('Средства: Тело — главное')).toBeVisible();
	await screen.getByText('Упр neck_rot').click();
	expect(JSON.parse(sessionStorage.getItem('dev:open-slots') ?? '[]')).toEqual([
		'warmup:W_cervical'
	]);
	await screen.getByText('Зона · Шея', { exact: false }).click();
	expect(JSON.parse(sessionStorage.getItem('dev:open-slots') ?? '[]')).toEqual([]);
});

it('базовое упражнение раздела и хранилище, которое не пишет', async () => {
	vi.spyOn(Storage.prototype, 'setItem').mockImplementationOnce(() => {
		throw new Error('quota');
	});
	const screen = await render(Page, { data } as never);
	await screen.getByText('Упр glute_bridge_m').click();
	await expect.element(screen.getByText('Средства: Тело — главное')).toBeVisible();
	await screen.getByText('Зона · Шея', { exact: false }).click();
	expect(sessionStorage.getItem('dev:open-slots')).toBeNull();
	await expect.element(screen.getByText('Упр neck_rot')).not.toBeInTheDocument();
});

it('открытые зоны восстанавливаются из хранилища', async () => {
	sessionStorage.setItem('dev:open-slots', '["warmup:W_cervical"]');
	const screen = await render(Page, { data } as never);
	await expect.element(screen.getByText('Упр neck_rot')).toBeVisible();
});

it('слот без зоны и упражнение без промпта', async () => {
	const screen = await render(Page, { data } as never);
	await screen.getByText('Колено — взять 1 из 1', { exact: false }).click();
	await screen.getByText('Упр k1').click();
	await screen.getByRole('tab', { name: 'Промпт' }).click();
	await expect.element(screen.getByText('промпта нет')).toBeVisible();
});

it('банк растяжки: контур, процедура, промпт, «процедуры нет»', async () => {
	const screen = await render(Page, { data } as never);
	await screen.getByText('Зона · Трапеция', { exact: false }).click();
	await screen.getByText('Наклон головы').click();
	await expect.element(screen.getByText('Обе седалищные кости лежат на скамье')).toBeVisible();
	await screen.getByRole('tab', { name: 'Промпт' }).click();
	await expect.element(screen.getByText('STORYBOARD — Наклон головы')).toBeVisible();
	await screen.getByText('Без процедуры').click();
	await expect.element(screen.getByText('процедуры нет')).toBeVisible();
});

it('копирование при недоступном буфере не падает; повреждённое хранилище игнорируется', async () => {
	sessionStorage.setItem('dev:open-slots', '{bad');
	vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValueOnce(new Error('denied'));
	const screen = await render(Page, { data } as never);
	await screen.getByText('Зона · Шея', { exact: false }).click();
	await screen.getByText('Упр neck_rot').click();
	await screen.getByRole('tab', { name: 'Промпт' }).click();
	await screen.getByRole('button', { name: 'Копировать' }).click();
	await expect.element(screen.getByRole('button', { name: 'Копировать' })).toBeVisible();
	expect(page).toBeDefined();
});
