import { describe, expect, it } from 'vitest';

import type { Program, Slot } from './program.ts';
import type { ContourLocator } from './section-outline.ts';

import { PROGRAM_BASE } from '../../../test/program-base.ts';
import { sectionOutlinesOf } from './section-outline.ts';

const CONTOURS: readonly ContourLocator[] = [
	{ contourTitle: 'шейный отдел', exerciseIds: ['n1', 'n2'], zoneId: 'z-neck', zoneTitle: 'Шея' },
	{ contourTitle: 'плечо', exerciseIds: ['s1'], zoneId: 'z-arm', zoneTitle: 'Плечевой пояс' },
	{
		contourTitle: 'локоть',
		exerciseIds: ['e1', 'e2'],
		zoneId: 'z-arm',
		zoneTitle: 'Плечевой пояс'
	}
];

const programOf = (slots: readonly Slot[]): Program => ({
	...PROGRAM_BASE,
	sections: [{ bank: 'b', id: 'sec', mode: 'dynamic', slots, slug: 'warmup', title: 'Разминка' }]
});

describe('sectionOutlinesOf', () => {
	it('разделяет базу и пул, узнаёт контур по составу слота и склеивает соседние слоты одной зоны', () => {
		const [section] = sectionOutlinesOf(
			programOf([
				{ exercises: ['b1', 'b2'], id: 'base', kind: 'base', label: 'База' },
				{ exercises: ['n2', 'n1'], id: 'neck', kind: 'pool', label: 'Шея', pick: 2 },
				{ allow_repeat: true, exercises: ['s1'], id: 'sh', kind: 'pool', label: 'Плечо' },
				{
					exercises: ['e1', 'e2'],
					id: 'el',
					kind: 'pool',
					label: 'Локоть',
					rule: 'правило'
				}
			]),
			CONTOURS
		);
		expect(section).toEqual({
			baseExerciseIds: ['b1', 'b2'],
			groups: [
				{
					id: 'neck',
					slots: [
						{
							allowRepeat: false,
							contourTitle: 'шейный отдел',
							exerciseIds: ['n2', 'n1'],
							id: 'neck',
							label: 'Шея',
							pick: 2
						}
					],
					zone: { id: 'z-neck', title: 'Шея' }
				},
				{
					id: 'sh',
					slots: [
						{
							allowRepeat: true,
							contourTitle: 'плечо',
							exerciseIds: ['s1'],
							id: 'sh',
							label: 'Плечо',
							pick: 1
						},
						{
							allowRepeat: false,
							contourTitle: 'локоть',
							exerciseIds: ['e1', 'e2'],
							id: 'el',
							label: 'Локоть',
							pick: 1,
							rule: 'правило'
						}
					],
					zone: { id: 'z-arm', title: 'Плечевой пояс' }
				}
			],
			id: 'sec',
			mode: 'dynamic',
			slug: 'warmup',
			title: 'Разминка'
		});
	});

	it('слот без контура остаётся отдельной группой без зоны и не склеивается ни с чем', () => {
		const [section] = sectionOutlinesOf(
			programOf([
				{ exercises: ['s1'], id: 'sh', kind: 'pool', label: 'Плечо' },
				{ exercises: ['x1', 'n1'], id: 'mix', kind: 'pool', label: 'Смесь' },
				{ exercises: ['e1', 'e2'], id: 'el', kind: 'pool', label: 'Локоть' },
				{ exercises: ['n1', 'n2'], id: 'neck', kind: 'pool', label: 'Шея' }
			]),
			CONTOURS
		);
		expect(
			section?.groups.map((group) => [group.id, group.zone?.id, group.slots.length])
		).toEqual([
			['sh', 'z-arm', 1],
			['mix', undefined, 1],
			['el', 'z-arm', 1],
			['neck', 'z-neck', 1]
		]);
	});
});
