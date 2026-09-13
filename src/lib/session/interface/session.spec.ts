import { describe, expect, it } from 'vitest';

import { createSession } from './session.ts';

const PROGRAM_ID = '01a0889d-8ae8-7c8a-b964-0ead5f668a5a';
const SEED = 7;
const session = createSession(() => SEED);

describe('createSession на боевых таблицах', () => {
	it('перечисляет Программы', () => {
		expect(session.listPrograms()).toEqual([
			{ id: PROGRAM_ID, title: 'Программа: БАЗА + ПУЛ' }
		]);
	});

	it('собирает Занятие, разбитое на пять Блоков', () => {
		const view = session.assembleSession(PROGRAM_ID);
		const sizes = view.blocks.map((block) => [block.name, block.items.length] as const);
		expect(sizes.slice(0, 4)).toEqual([
			['Разогрев', 1],
			['Разминка', 14],
			['Силовой', 4],
			['Изометрия', 4]
		]);
		expect(sizes[4]?.[0]).toBe('Растяжка');
		expect(sizes[4]?.[1]).toBeGreaterThanOrEqual(5);
	});

	it('на одном зерне собирает одно Занятие, без зерна берёт случайное', () => {
		expect(createSession(() => SEED).assembleSession(PROGRAM_ID)).toEqual(
			session.assembleSession(PROGRAM_ID)
		);
		expect(createSession().assembleSession(PROGRAM_ID).blocks).toHaveLength(5);
	});

	it('отдаёт зерно вместе с Занятием', () => {
		expect(session.assembleSession(PROGRAM_ID).seed).toBe(SEED);
	});

	it('даёт каждому Упражнению название и Дозу', () => {
		const items = session.assembleSession(PROGRAM_ID).blocks.flatMap((block) => block.items);
		for (const item of items) {
			expect(item.name).not.toBe('');
			expect(item.dose).not.toBe('');
		}
	});

	it('раскрывает каждое Упражнение Занятия процедурой и Мишенями', () => {
		const items = session.assembleSession(PROGRAM_ID).blocks.flatMap((block) => block.items);
		for (const item of items) {
			expect(item.detail.steps.length).toBeGreaterThan(0);
			expect(item.detail.targets).not.toBe('');
		}
	});
});
