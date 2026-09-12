import { describe, expect, it } from 'vitest';

import { createSession } from './session.ts';

const PROGRAM_ID = '01a0889d-8ae8-7c8a-b964-0ead5f668a5a';
const session = createSession();

describe('createSession на боевых таблицах', () => {
	it('перечисляет Программы', () => {
		expect(session.listPrograms()).toEqual([{ id: PROGRAM_ID, title: 'Закрепления и добор' }]);
	});

	it('собирает Занятие, разбитое на пять Блоков', () => {
		const view = session.assembleSession(PROGRAM_ID);
		expect(view.blocks.map((block) => [block.name, block.items.length])).toEqual([
			['Разогрев', 0],
			['Разминка', 14],
			['Силовой', 4],
			['Изометрия', 4],
			['Растяжка', 4]
		]);
	});

	it('даёт каждому Упражнению название и Дозу', () => {
		const items = session.assembleSession(PROGRAM_ID).blocks.flatMap((block) => block.items);
		for (const item of items) {
			expect(item.name).not.toBe('');
			expect(item.dose).not.toBe('');
		}
	});
});
