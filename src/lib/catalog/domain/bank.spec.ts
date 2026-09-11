import { describe, expect, it } from 'vitest';

import type { Bank, BankExercise } from './bank.ts';

import { uuidOf } from '../../shared/uuid.ts';
import { bankRecords, contoursOf, mainEquipmentRefsOf } from './bank.ts';

const ID = uuidOf('01a0889d-3852-7051-a039-c9778729a468');

const exerciseOf = (over: Partial<BankExercise> = {}): BankExercise => ({
	constraints: { axial: false, free_weight: false, lumbar_ext: false, lumbar_flex: false },
	dose: '3×12',
	equipment: [{ id: ID, role: 'main' }],
	id: ID,
	mode: 'loaded',
	name: 'Упражнение',
	slug: 'exercise',
	targets: [{ id: ID, role: 'primary' }],
	...over
});

const bankOf = (exercises: readonly BankExercise[]): Bank => ({
	id: ID,
	rules: [],
	slug: 'strength',
	title: 'Сила',
	zones: [
		{
			contours: [{ exercises, id: ID, slug: 'contour', title: 'Контур' }],
			id: ID,
			slug: 'zone',
			title: 'Зона'
		}
	]
});

describe('bankRecords', () => {
	it('раскрывает зоны и контуры в плоский список записей', () => {
		const records = bankRecords(bankOf([exerciseOf(), exerciseOf({ slug: 'second' })]));
		const slugs = records.map(({ exercise }) => exercise.slug);
		expect(slugs).toEqual(['exercise', 'second']);
		expect(records[0]?.zone.slug).toBe('zone');
		expect(records[0]?.contour.slug).toBe('contour');
	});
});

describe('contoursOf', () => {
	it('перечисляет контуры вместе с зоной', () => {
		const contours = contoursOf(bankOf([exerciseOf()]));
		expect(contours.map(({ contour }) => contour.slug)).toEqual(['contour']);
		expect(contours[0]?.zone.title).toBe('Зона');
	});
});

describe('mainEquipmentRefsOf', () => {
	it('оставляет только ссылки с ролью main', () => {
		const exercise = exerciseOf({
			equipment: [
				{ id: ID, role: 'auxiliary' },
				{ id: ID, role: 'main' }
			]
		});
		expect(mainEquipmentRefsOf(exercise)).toEqual([{ id: ID, role: 'main' }]);
	});

	it('возвращает пустой список, когда главного средства нет', () => {
		const exercise = exerciseOf({ equipment: [{ id: ID, role: 'auxiliary' }] });
		expect(mainEquipmentRefsOf(exercise)).toEqual([]);
	});
});
