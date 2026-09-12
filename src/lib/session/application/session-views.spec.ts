import { describe, expect, it } from 'vitest';

import { CATALOG, DETAILS, PROGRAM } from '../../../test/session-fixtures.ts';
import { sessionOf } from '../domain/assembly.ts';
import { programCardOf, sessionViewOf } from './session-views.ts';

const session = sessionOf(PROGRAM, CATALOG);
const view = sessionViewOf(PROGRAM, CATALOG, session, DETAILS);

describe('sessionViewOf', () => {
	it('разбивает Занятие на все Блоки Программы по порядку', () => {
		expect(view.title).toBe('Закрепления и добор');
		expect(view.blocks.map((block) => [block.name, block.items.length])).toEqual([
			['Разогрев', 1],
			['Разминка', 2],
			['Силовой', 3]
		]);
	});

	it('несёт название и Дозу каждого Упражнения', () => {
		expect(view.blocks[1]?.items.map((item) => [item.ord, item.name, item.dose])).toEqual([
			[2, 'Круги головой', '2×10'],
			[3, 'Наклоны головы', '2×8']
		]);
	});

	it('раскрывает Упражнение: оборудование и Мишени с ролями, заметку и процедуру с оракулами', () => {
		expect(view.blocks[1]?.items[0]?.detail).toEqual({
			equipment: 'Тело — main',
			note: 'медленно',
			steps: [
				{
					active: 'Шея · Трапеция',
					id: 'step-1',
					oracles: [
						{
							counterModel: ['рывок'],
							id: 'oracle-1',
							model: ['плавно'],
							predicate: 'Плечи опущены'
						}
					],
					title: 'Наклон'
				}
			],
			targets: 'Шея — primary'
		});
		expect(view.blocks[1]?.items[1]?.detail.note).toBeUndefined();
	});

	it('отдаёт только Упражнения Занятия, а не весь каталог', () => {
		const shown = view.blocks.flatMap((block) => block.items.map((item) => item.name));
		expect(shown).toHaveLength(6);
		expect(shown).not.toContain('Голубь');
	});

	it('бросает, когда позиция ссылается на Упражнение вне каталога', () => {
		const lost = {
			items: [{ block: 'block-warmup', dose: '1×1', exercise: 'lost', ord: 1, target: 't' }],
			program: 'program-1'
		};
		expect(() => sessionViewOf(PROGRAM, CATALOG, lost, DETAILS)).toThrow('lost');
	});

	it('бросает, когда у Упражнения нет процедуры в таблицах', () => {
		expect(() => sessionViewOf(PROGRAM, CATALOG, session, new Map())).toThrow('ex-bike');
	});
});

describe('programCardOf', () => {
	it('показывает Программу идентификатором и названием', () => {
		expect(programCardOf(PROGRAM)).toEqual({ id: 'program-1', title: 'Закрепления и добор' });
	});
});
