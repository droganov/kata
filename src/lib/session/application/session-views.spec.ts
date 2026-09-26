import { describe, expect, it } from 'vitest';

import type { Session } from '../domain/session.ts';

import { CATALOG, DETAILS, PROGRAM } from '../../../test/session-fixtures.ts';
import { programCardOf, sessionViewOf } from './session-views.ts';

const SEED = 7;

const session: Session = {
	items: [
		{
			block: 'block-cardio',
			dose: '5 мин',
			exercise: 'ex-bike',
			ord: 1,
			target: 'target-cardio'
		},
		{
			block: 'block-warmup',
			dose: '2×10',
			exercise: 'ex-neck-roll',
			ord: 2,
			target: 'target-cervical'
		},
		{
			block: 'block-warmup',
			dose: '2×8',
			exercise: 'ex-neck-tilt',
			ord: 3,
			target: 'target-cervical'
		},
		{
			block: 'block-strength',
			dose: '3×15',
			exercise: 'ex-bridge',
			ord: 4,
			target: 'target-glutes'
		},
		{
			block: 'block-strength',
			dose: '3×10',
			exercise: 'ex-press',
			ord: 5,
			target: 'target-chest'
		},
		{
			block: 'block-strength',
			dose: '3×12',
			exercise: 'ex-row',
			ord: 6,
			target: 'target-rhomboids'
		}
	],
	program: 'program-1',
	seed: SEED
};
const view = sessionViewOf(PROGRAM, CATALOG, session, DETAILS);

describe('sessionViewOf', () => {
	it('разбивает Занятие на все Блоки Программы по порядку', () => {
		expect(view.title).toBe('Закрепления и добор');
		expect(view.blocks.map((block) => [block.name, block.items.length])).toEqual([
			['Разогрев', 1],
			['Разминка', 2],
			['Силовой', 3],
			['Растяжка', 0]
		]);
	});

	it('несёт Программу Занятия и Упражнение каждой Позиции', () => {
		expect(view.program).toBe('program-1');
		expect(view.blocks[2]?.items.map((item) => item.exercise)).toEqual([
			'ex-bridge',
			'ex-press',
			'ex-row'
		]);
	});

	it('несёт Мишень Позиции, первую сборку и то, можно ли пересобрать Мишень', () => {
		expect(
			view.blocks[2]?.items.map((item) => [item.target, item.drawNo, item.isTargetRedrawable])
		).toEqual([
			['target-glutes', 1, true],
			['target-chest', 1, false],
			['target-rhomboids', 1, true]
		]);
		expect(view.blocks[0]?.items[0]?.isTargetRedrawable).toBe(false);
	});

	it('несёт зерно Занятия', () => {
		expect(view.seed).toBe(SEED);
	});

	it('несёт название и Дозу каждого Упражнения', () => {
		expect(view.blocks[1]?.items.map((item) => [item.ord, item.name, item.dose])).toEqual([
			[2, 'Круги головой', '2×10'],
			[3, 'Наклоны головы', '2×8']
		]);
	});

	it('раскрывает Упражнение: оборудование и Мишени с ролями по-русски, заметку и процедуру с оракулами', () => {
		expect(view.blocks[1]?.items[0]?.detail).toEqual({
			equipment: [
				{ name: 'Коврик', role: 'главное' },
				{ name: 'Стена', role: 'вспомогательное' }
			],
			note: 'медленно',
			steps: [
				{
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
			targets: [
				{ names: 'Шея, Лестничные', role: 'Первичные' },
				{ names: 'Трапеция', role: 'Стабилизаторы' }
			]
		});
		expect(view.blocks[1]?.items[1]?.detail.note).toBeUndefined();
	});

	it('не несёт коды ролей и пустые группы Мишеней', () => {
		expect(view.blocks[1]?.items[1]?.detail).toEqual({
			equipment: [{ name: 'Тело', role: 'главное' }],
			steps: [],
			targets: [{ names: 'Шея', role: 'Первичные' }]
		});
	});

	it('отдаёт только Упражнения Занятия, а не весь каталог', () => {
		const shown = view.blocks.flatMap((block) => block.items.map((item) => item.name));
		expect(shown).toHaveLength(6);
		expect(shown).not.toContain('Голубь');
	});

	it('не отдаёт процедуру, оракулы, оборудование, Мишени и заметку Упражнений вне Занятия', () => {
		const foreign = {
			equipment: [{ name: 'Чужой коврик', role: 'main' }],
			note: 'чужая заметка',
			steps: [
				{
					active: [],
					id: 'step-foreign',
					oracles: [
						{
							counterModel: ['чужое неправильно'],
							id: 'oracle-foreign',
							model: ['чужое правильно'],
							predicate: 'Чужой оракул'
						}
					],
					title: 'Чужой шаг'
				}
			],
			targets: [{ name: 'Чужая мишень', role: 'primary' }]
		};
		const sent = JSON.stringify(
			sessionViewOf(PROGRAM, CATALOG, session, new Map([...DETAILS, ['ex-pigeon', foreign]]))
		);
		expect(sent).not.toMatch(/Чуж|чуж/v);
	});

	it('бросает, когда позиция ссылается на Упражнение вне каталога', () => {
		const lost = {
			items: [{ block: 'block-warmup', dose: '1×1', exercise: 'lost', ord: 1, target: 't' }],
			program: 'program-1',
			seed: SEED
		};
		expect(() => sessionViewOf(PROGRAM, CATALOG, lost, DETAILS)).toThrow('lost');
	});

	it('бросает, когда роль оборудования неизвестна, а не показывает её код', () => {
		const odd = new Map([
			...DETAILS,
			['ex-bike', { equipment: [{ name: 'Тело', role: 'odd' }], steps: [], targets: [] }]
		]);
		expect(() => sessionViewOf(PROGRAM, CATALOG, session, odd)).toThrow('odd');
	});

	it('бросает, когда роль Мишени неизвестна, а не теряет Мишень', () => {
		const odd = new Map([
			...DETAILS,
			[
				'ex-bike',
				{ equipment: [], steps: [], targets: [{ name: 'Шея', role: 'odd-target' }] }
			]
		]);
		expect(() => sessionViewOf(PROGRAM, CATALOG, session, odd)).toThrow('odd-target');
	});

	it('бросает, когда у Упражнения нет процедуры в таблицах', () => {
		expect(() => sessionViewOf(PROGRAM, CATALOG, session, new Map())).toThrow('ex-bike');
	});
});

describe('programCardOf', () => {
	it('показывает Программу идентификатором и названием', () => {
		expect(programCardOf(PROGRAM)).toEqual({
			account: 'person-1',
			id: 'program-1',
			title: 'Закрепления и добор'
		});
	});
});
