import { goto } from '$app/navigation';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { SessionView } from '../../../lib/session/application/session-views.ts';
import type { ActiveSession, SessionMark, Store } from '../../../lib/session/application/store.ts';

import { createBrowserStore } from '../../../lib/session/infrastructure/browser-store.ts';
import { sessionScreenOf } from '../../../lib/session/interface/session-screen.ts';
import Page from './+page.svelte';

vi.mock('$app/navigation', () => ({ goto: vi.fn() }));

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
					drawNo: 1,
					exercise: 'ex-neck-roll',
					isTargetRedrawable: false,
					name: 'Круги головой',
					ord: 1,
					target: 'target-cervical'
				},
				{
					detail: PLAIN_DETAIL,
					dose: '40с × 2',
					drawNo: 1,
					exercise: 'ex-neck-tilt',
					isTargetRedrawable: false,
					name: 'Наклоны головы',
					ord: 2,
					target: 'target-cervical'
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
					drawNo: 1,
					exercise: 'ex-bridge',
					isTargetRedrawable: true,
					name: 'Ягодичный мост',
					ord: 3,
					target: 'target-glutes'
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

const renderAt = (session: ActiveSession, address = '', isHistoryWarningDue = false): void => {
	render(Page, {
		data: sessionScreenOf({ isHistoryWarningDue, session }, new URLSearchParams(address))
	});
};

const storedMarks = async (): Promise<ActiveSession['marks'] | undefined> => {
	const active = await store().activeSession(ACCOUNT);
	return active?.marks;
};

const exerciseName = (): null | string => screen.getByRole('heading', { level: 1 }).textContent;

const hrefOf = (name: RegExp | string): null | string =>
	screen.getByRole('link', { name }).getAttribute('href');

beforeEach(() => {
	sessionStorage.clear();
	vi.unstubAllGlobals();
	vi.mocked(goto).mockClear();
});

describe('экран прохождения Занятия', () => {
	it('показывает одно Упражнение: название, Дозу и заметку', async () => {
		renderAt(await openedWith());
		expect(exerciseName()).toBe('Круги головой');
		expect(screen.getByText('2×10')).toBeInTheDocument();
		expect(screen.getByText('медленно')).toBeInTheDocument();
		expect(screen.queryByText('Наклоны головы')).not.toBeInTheDocument();
		expect(screen.queryByRole('alert')).not.toBeInTheDocument();
	});

	it('прячет оборудование и Мишени с ролями по-русски в раскрытие над шагами', async () => {
		renderAt(await openedWith());
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
		renderAt(await openedWith());
		const step = screen.getByText('1. Наклон').closest('details');
		expect(step).not.toHaveAttribute('open');
		const inside = within(step!);
		expect(inside.getByText('Плечи опущены')).toBeInTheDocument();
		expect(inside.getByText('плавно')).toBeInTheDocument();
		expect(inside.getByText('неправильно')).toBeInTheDocument();
		expect(inside.getByText('рывок')).toBeInTheDocument();
	});

	it('помнит раскрытия во вкладке и открывает их снова', async () => {
		const session = await openedWith();
		renderAt(session);
		for (const title of ['Оборудование и Мишени', '1. Наклон']) {
			const details = screen.getByText(title).closest('details')!;
			details.open = true;
			await fireEvent(details, new Event('toggle'));
		}
		cleanup();
		renderAt(session);
		expect(screen.getByText('Оборудование и Мишени').closest('details')).toHaveAttribute(
			'open'
		);
		const step = screen.getByText('1. Наклон').closest('details')!;
		expect(step).toHaveAttribute('open');
		step.open = false;
		await fireEvent(step, new Event('toggle'));
		cleanup();
		renderAt(session);
		expect(screen.getByText('1. Наклон').closest('details')).not.toHaveAttribute('open');
	});

	it('показывает место внутри Блока и строку всех Блоков с отмеченным', async () => {
		renderAt(await openedWith());
		expect(screen.getByText('1 из 2')).toBeInTheDocument();
		const line = screen.getByRole('list', { name: 'Блоки Занятия' });
		expect(
			within(line)
				.getAllByRole('link')
				.map((link) => [
					link.textContent.replaceAll(/\s+/gv, ' ').trim(),
					link.getAttribute('href')
				])
		).toEqual([
			['Разминка 0/2 ▾', '?item=1&block=b-warmup'],
			['Силовой 0/1', '?item=3']
		]);
	});

	it('текущий Блок раскрывает свои Позиции, чужой Блок ведёт в себя и своих не раскрывает', async () => {
		const session = await openedWith({ ord: 1, status: 'done' });
		renderAt(session, '?item=3&block=b-warmup');
		expect(
			screen.queryByRole('list', { name: 'Позиции Блока Разминка' })
		).not.toBeInTheDocument();
		expect(hrefOf(/Разминка/v)).toBe('?item=2');
		expect(hrefOf(/Силовой/v)).toBe('?item=3&block=b-strength');
		cleanup();
		renderAt(session, '?item=3&block=b-strength');
		expect(screen.getByRole('list', { name: 'Позиции Блока Силовой' })).toBeInTheDocument();
		expect(screen.getByRole('link', { name: /Силовой/v })).toHaveAttribute(
			'aria-expanded',
			'true'
		);
		expect(hrefOf(/Силовой/v)).toBe('?item=3');
		expect(screen.getByText('Разогрев', { exact: false }).closest('a')).toBeNull();
	});

	it('Отметка «выполнено» сохраняется и ведёт к следующему Упражнению', async () => {
		renderAt(await openedWith());
		await fireEvent.click(screen.getByRole('button', { name: 'Выполнено' }));
		expect(await storedMarks()).toEqual([{ ord: 1, status: 'done' }]);
		expect(goto).toHaveBeenCalledWith('?item=2', { invalidateAll: true });
	});

	it('Отметка «пропущено» ведёт к следующему Упражнению через границу Блока', async () => {
		renderAt(await openedWith({ ord: 1, status: 'done' }));
		await fireEvent.click(screen.getByRole('button', { name: 'Пропущено' }));
		expect(await storedMarks()).toEqual([
			{ ord: 1, status: 'done' },
			{ ord: 2, status: 'skipped' }
		]);
		expect(goto).toHaveBeenCalledWith('?item=3', { invalidateAll: true });
	});

	it('открывает Позицию из адреса с её Отметкой и меняет Отметку', async () => {
		renderAt(await openedWith({ ord: 1, status: 'done' }), '?item=1');
		expect(exerciseName()).toBe('Круги головой');
		expect(screen.getByText('выполнено', { selector: '.badge' })).toBeInTheDocument();
		await fireEvent.click(screen.getByRole('button', { name: 'Пропущено' }));
		expect(await storedMarks()).toEqual([{ ord: 1, status: 'skipped' }]);
		expect(goto).toHaveBeenCalledWith('?item=2', { invalidateAll: true });
	});

	it('стрелки ведут адресом к соседним Позициям через границы Блоков', async () => {
		const session = await openedWith();
		renderAt(session, '?item=2');
		expect([hrefOf('Предыдущая Позиция'), hrefOf('Следующая Позиция')]).toEqual([
			'?item=1',
			'?item=3'
		]);
		cleanup();
		renderAt(session, '?item=3');
		expect(screen.queryByRole('link', { name: 'Следующая Позиция' })).not.toBeInTheDocument();
		expect(screen.getByText('1 из 1')).toBeInTheDocument();
	});

	it('открытый адресом Блок показывает Позиции с Дозой или Отметкой и ведёт к ним', async () => {
		renderAt(await openedWith({ ord: 1, status: 'done' }), '?item=2&block=b-warmup');
		const sessionItems = screen.getByRole('list', { name: 'Позиции Блока Разминка' });
		expect(within(sessionItems).getByText('выполнено')).toBeInTheDocument();
		expect(within(sessionItems).getByText('40с × 2')).toBeInTheDocument();
		expect(within(sessionItems).getByRole('link', { name: /Круги головой/v })).toHaveAttribute(
			'href',
			'?item=1'
		);
		expect(hrefOf(/Разминка/v)).toBe('?item=2');
	});

	it('последняя Отметка завершает Занятие и ведёт на экран завершения', async () => {
		renderAt(await openedWith({ ord: 1, status: 'done' }, { ord: 2, status: 'skipped' }));
		await fireEvent.click(screen.getByRole('button', { name: 'Выполнено' }));
		expect(await store().activeSession(ACCOUNT)).toBeUndefined();
		expect(goto).toHaveBeenCalledWith('/programs/program-1/finished');
	});

	it('отмена закрывает Занятие и возвращает к списку Программ', async () => {
		renderAt(await openedWith({ ord: 1, status: 'done' }));
		await fireEvent.click(screen.getByRole('button', { name: 'Отменить Занятие' }));
		expect(await store().activeSession(ACCOUNT)).toBeUndefined();
		expect(goto).toHaveBeenCalledWith('/');
	});

	it('неотмеченную Позицию пересобирает на уровне Упражнения и остаётся на ней', async () => {
		const replacement = {
			...VIEW.blocks[2]!.items[0]!,
			exercise: 'ex-hip-thrust',
			name: 'Тяга бедром'
		};
		const asked: Request[] = [];
		vi.stubGlobal('fetch', (_input: string, init?: RequestInit) => {
			asked.push(new Request('http://localhost/', init));
			return Promise.resolve(Response.json(replacement));
		});
		renderAt(await openedWith(), '?item=3');
		await fireEvent.click(screen.getByRole('button', { name: 'Другое Упражнение' }));
		await vi.waitFor(() => {
			expect(goto).toHaveBeenCalledWith('?item=3', { invalidateAll: true });
		});
		expect(await asked[0]!.json()).toMatchObject({ redraw: { level: 'exercise', ord: 3 } });
		const active = await store().activeSession(ACCOUNT);
		cleanup();
		renderAt(active!, '?item=3');
		expect(exerciseName()).toBe('Тяга бедром');
		expect(active?.view.blocks[2]?.items[0]?.drawNo).toBe(2);
	});

	it('пересобирает Мишень, где это возможно, и говорит, когда замены нет', async () => {
		vi.stubGlobal('fetch', () => Promise.resolve(new Response(null, { status: 409 })));
		const session = await openedWith();
		renderAt(session);
		expect(screen.queryByRole('button', { name: 'Другая Мишень' })).not.toBeInTheDocument();
		cleanup();
		renderAt(session, '?item=3');
		expect(screen.queryByRole('status')).not.toBeInTheDocument();
		await fireEvent.click(screen.getByRole('button', { name: 'Другая Мишень' }));
		expect(await screen.findByRole('status')).toHaveTextContent('Замены нет');
		expect(goto).not.toHaveBeenCalled();
		expect(exerciseName()).toBe('Ягодичный мост');
	});

	it('отмеченную Позицию не пересобирает', async () => {
		renderAt(await openedWith({ ord: 3, status: 'skipped' }), '?item=3');
		expect(screen.queryByRole('button', { name: 'Другое Упражнение' })).not.toBeInTheDocument();
		expect(screen.queryByRole('button', { name: 'Другая Мишень' })).not.toBeInTheDocument();
	});

	it('не пересобирает всё Занятие, а ведёт на главную', async () => {
		renderAt(await openedWith());
		expect(
			screen.queryByRole('button', { name: 'Пересобрать Занятие' })
		).not.toBeInTheDocument();
		expect(hrefOf('На главную')).toBe('/');
	});

	it('без Позиций говорит, что Упражнений нет', async () => {
		renderAt(await store().openSession(ACCOUNT, { ...VIEW, blocks: [] }));
		expect(hrefOf('На главную')).toBe('/');
		expect(screen.getByText('Упражнений нет')).toBeInTheDocument();
		expect(screen.queryByRole('button', { name: 'Выполнено' })).not.toBeInTheDocument();
	});

	it('один раз предупреждает, что История не сохраняется', async () => {
		renderAt(await openedWith(), '', true);
		expect(screen.getByRole('alert')).toHaveTextContent('История не сохраняется');
	});
});
