import { describe, expect, it } from 'vitest';

import { CATALOG, PROGRAM } from '../../../test/session-fixtures.ts';
import { sessionOf } from '../domain/assembly.ts';
import { programCardOf, sessionViewOf } from './session-views.ts';

const view = sessionViewOf(PROGRAM, CATALOG, sessionOf(PROGRAM, CATALOG));

describe('sessionViewOf', () => {
	it('разбивает Занятие на все Блоки Программы по порядку, пустые тоже', () => {
		expect(view.title).toBe('Закрепления и добор');
		expect(view.blocks.map((block) => [block.name, block.items.length])).toEqual([
			['Разогрев', 0],
			['Разминка', 2],
			['Силовой', 3]
		]);
	});

	it('несёт название и Дозу каждого Упражнения', () => {
		expect(view.blocks[1]?.items).toEqual([
			{ dose: '2×10', name: 'Круги головой', ord: 1 },
			{ dose: '2×8', name: 'Наклоны головы', ord: 2 }
		]);
	});

	it('отдаёт только Упражнения Занятия, а не весь каталог', () => {
		const shown = view.blocks.flatMap((block) => block.items.map((item) => item.name));
		expect(shown).toHaveLength(5);
		expect(shown).not.toContain('Голубь');
	});

	it('бросает, когда позиция ссылается на Упражнение вне каталога', () => {
		const session = {
			items: [{ block: 'block-warmup', dose: '1×1', exercise: 'lost', ord: 1, target: 't' }],
			program: 'program-1'
		};
		expect(() => sessionViewOf(PROGRAM, CATALOG, session)).toThrow('lost');
	});
});

describe('programCardOf', () => {
	it('показывает Программу идентификатором и названием', () => {
		expect(programCardOf(PROGRAM)).toEqual({ id: 'program-1', title: 'Закрепления и добор' });
	});
});
