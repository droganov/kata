import { fireEvent, render, screen, within } from '@testing-library/svelte';
import { beforeEach, describe, expect, it } from 'vitest';

import type { SessionView } from '../../../lib/session/application/session-views.ts';
import type { ActiveSession, SessionMark, Store } from '../../../lib/session/application/store.ts';

import { createBrowserStore } from '../../../lib/session/infrastructure/browser-store.ts';
import Page from './+page.svelte';

const ACCOUNT = 'person-a';

const PLAIN_DETAIL = {
	equipment: [{ name: 'Тело', role: 'главное' }],
	steps: [],
	targets: [{ names: 'Шея', role: 'Первичные' }]
};

const VIEW: SessionView = {
	blocks: [
		{ id: 'b-cardio', items: [], name: 'Разогрев' },
		{
			id: 'b-warmup',
			items: [
				{
					detail: {
						equipment: [
							{ name: 'Коврик', role: 'главное' },
							{ name: 'Стена', role: 'вспомогательное' }
						],
						note: 'медленно',
						steps: [
							{
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
						targets: [
							{ names: 'Шея, Лестничные', role: 'Первичные' },
							{ names: 'Трапеция', role: 'Стабилизаторы' }
						]
					},
					dose: '2×10',
					exercise: 'ex-neck-roll',
					name: 'Круги головой',
					ord: 1
				},
				{
					detail: PLAIN_DETAIL,
					dose: '40с × 2',
					exercise: 'ex-neck-tilt',
					name: 'Наклоны головы',
					ord: 2
				}
			],
			name: 'Разминка'
		},
		{
			id: 'b-strength',
			items: [
				{
					detail: PLAIN_DETAIL,
					dose: '3×15',
					exercise: 'ex-bridge',
					name: 'Ягодичный мост',
					ord: 3
				}
			],
			name: 'Силовой'
		}
	],
	program: 'program-1',
	seed: 7,
	title: 'Закрепления и добор'
};

const store = (): Store =>
	createBrowserStore({
		indexedDB: undefined,
		now: () => new Date('2026-09-26T08:00:00.000Z'),
		storage: sessionStorage
	});

const openedWith = async (...marks: readonly SessionMark[]): Promise<ActiveSession> => {
	let session = await store().openSession(ACCOUNT, VIEW);
	for (const mark of marks) session = await store().markExercise(ACCOUNT, mark);
	return session;
};

const renderWith = (session: ActiveSession, isHistoryWarningDue = false): void => {
	render(Page, { data: { isHistoryWarningDue, session } });
};

const storedMarks = async (): Promise<ActiveSession['marks'] | undefined> => {
	const active = await store().activeSession(ACCOUNT);
	return active?.marks;
};

const exerciseName = (): null | string => screen.getByRole('heading', { level: 1 }).textContent;

beforeEach(() => {
	sessionStorage.clear();
});

describe('экран прохождения Занятия', () => {
	it('показывает одно Упражнение: название, Дозу и заметку', async () => {
		renderWith(await openedWith());
		expect(exerciseName()).toBe('Круги головой');
		expect(screen.getByText('2×10')).toBeInTheDocument();
		expect(screen.getByText('медленно')).toBeInTheDocument();
		expect(screen.queryByText('Наклоны головы')).not.toBeInTheDocument();
		expect(screen.queryByRole('alert')).not.toBeInTheDocument();
	});

	it('прячет оборудование и Мишени с ролями по-русски в раскрытие над шагами', async () => {
		renderWith(await openedWith());
		const disclosure = screen.getByText('Оборудование и Мишени').closest('details');
		expect(disclosure).not.toHaveAttribute('open');
		const inside = within(disclosure!);
		expect(inside.getByText('Коврик')).toBeInTheDocument();
		expect(inside.getByText('· главное')).toBeInTheDocument();
		expect(inside.getByText('· вспомогательное')).toBeInTheDocument();
		expect(inside.getByText('Первичные')).toBeInTheDocument();
		expect(inside.getByText('Шея, Лестничные')).toBeInTheDocument();
		expect(inside.getByText('Стабилизаторы')).toBeInTheDocument();
		expect(inside.queryByText('Вторичные')).not.toBeInTheDocument();
	});

	it('раскрывает каждый шаг процедуры его оракулами', async () => {
		renderWith(await openedWith());
		const step = screen.getByText('1. Наклон').closest('details');
		expect(step).not.toHaveAttribute('open');
		const inside = within(step!);
		expect(inside.getByText('Плечи опущены')).toBeInTheDocument();
		expect(inside.getByText('плавно')).toBeInTheDocument();
		expect(inside.getByText('неправильно')).toBeInTheDocument();
		expect(inside.getByText('рывок')).toBeInTheDocument();
	});

	it('показывает место внутри Блока и строку всех Блоков с отмеченным', async () => {
		renderWith(await openedWith());
		expect(screen.getByText('1 из 2')).toBeInTheDocument();
		const line = screen.getByRole('list', { name: 'Блоки Занятия' });
		expect(
			within(line)
				.getAllByRole('button')
				.map((button) => button.textContent.replaceAll(/\s+/gv, ' ').trim())
		).toEqual(['Разогрев 0/0', 'Разминка 0/2', 'Силовой 0/1']);
	});

	it('Отметка «выполнено» переводит к следующему Упражнению и сохраняется', async () => {
		renderWith(await openedWith());
		await fireEvent.click(screen.getByRole('button', { name: 'Выполнено' }));
		expect(exerciseName()).toBe('Наклоны головы');
		expect(screen.getByText('2 из 2')).toBeInTheDocument();
		expect(screen.getByRole('button', { name: /Разминка/v })).toHaveTextContent('1/2');
		expect(await storedMarks()).toEqual([{ ord: 1, status: 'done' }]);
	});

	it('Отметка «пропущено» переводит к следующему Упражнению через границу Блока', async () => {
		renderWith(await openedWith({ ord: 1, status: 'done' }));
		await fireEvent.click(screen.getByRole('button', { name: 'Пропущено' }));
		expect(exerciseName()).toBe('Ягодичный мост');
		expect(screen.getByText('1 из 1')).toBeInTheDocument();
		expect(await storedMarks()).toEqual([
			{ ord: 1, status: 'done' },
			{ ord: 2, status: 'skipped' }
		]);
	});

	it('после перезагрузки открывает первое неотмеченное Упражнение', async () => {
		renderWith(await openedWith({ ord: 1, status: 'done' }, { ord: 2, status: 'skipped' }));
		expect(exerciseName()).toBe('Ягодичный мост');
		expect(screen.getByRole('button', { name: /Разминка/v })).toHaveTextContent('2/2');
	});

	it('стрелками возвращается к отмеченному Упражнению и меняет его Отметку', async () => {
		renderWith(await openedWith({ ord: 1, status: 'done' }));
		expect(screen.getByRole('button', { name: 'Следующая Позиция' })).not.toBeDisabled();
		await fireEvent.click(screen.getByRole('button', { name: 'Предыдущая Позиция' }));
		expect(exerciseName()).toBe('Круги головой');
		expect(screen.getByText('выполнено', { selector: '.badge' })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Предыдущая Позиция' })).toBeDisabled();
		await fireEvent.click(screen.getByRole('button', { name: 'Пропущено' }));
		expect(exerciseName()).toBe('Наклоны головы');
		expect(await storedMarks()).toEqual([{ ord: 1, status: 'skipped' }]);
	});

	it('стрелкой вперёд переходит к соседней Позиции через границу Блока', async () => {
		renderWith(await openedWith({ ord: 1, status: 'done' }));
		await fireEvent.click(screen.getByRole('button', { name: 'Следующая Позиция' }));
		expect(exerciseName()).toBe('Ягодичный мост');
		expect(screen.getByRole('button', { name: 'Следующая Позиция' })).toBeDisabled();
	});

	it('без Позиций говорит, что Упражнений нет', async () => {
		const empty = await store().openSession(ACCOUNT, { ...VIEW, blocks: [] });
		renderWith(empty);
		expect(screen.getByText('Упражнений нет')).toBeInTheDocument();
		expect(screen.queryByRole('button', { name: 'Выполнено' })).not.toBeInTheDocument();
	});

	it('открывает Блок из строки и из него любую его Позицию с Дозой или Отметкой', async () => {
		renderWith(await openedWith({ ord: 1, status: 'done' }));
		await fireEvent.click(screen.getByRole('button', { name: /Разминка/v }));
		const sessionItems = screen.getByRole('list', { name: 'Позиции Блока Разминка' });
		expect(within(sessionItems).getByText('выполнено')).toBeInTheDocument();
		expect(within(sessionItems).getByText('40с × 2')).toBeInTheDocument();
		await fireEvent.click(within(sessionItems).getByRole('button', { name: /Круги головой/v }));
		expect(exerciseName()).toBe('Круги головой');
		expect(
			screen.queryByRole('list', { name: 'Позиции Блока Разминка' })
		).not.toBeInTheDocument();
	});

	it('один раз предупреждает, что История не сохраняется', async () => {
		renderWith(await openedWith(), true);
		expect(screen.getByRole('alert')).toHaveTextContent('История не сохраняется');
	});
});
