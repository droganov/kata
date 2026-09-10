import { describe, expect, it } from 'vitest';

import type { Bank, BankExercise, Contour, Zone } from '../bank.ts';
import type { Catalog } from '../catalog.ts';

import { uuidOf } from '../../../shared/uuid.ts';
import {
	filledContours,
	pickWithinContourBank,
	russianNames,
	singleDosePerRecord,
	singleMovementAllowingPerSide,
	singleMovementPerRecord,
	uniqueRecords,
	zonesMatchStrengthBank
} from './common-rules.ts';

const ID = uuidOf('01a0889d-3852-7051-a039-c9778729a468');
const OTHER_ID = uuidOf('01a0889d-3800-7ef5-adfd-a56bcb2334c5');

const exerciseOf = (over: Partial<BankExercise> = {}): BankExercise => ({
	constraints: { axial: false, free_weight: false, lumbar_ext: false, lumbar_flex: false },
	dose: '3×12',
	equipment: [{ id: ID, role: 'main' }],
	id: ID,
	mode: 'loaded',
	name: 'Приседания',
	slug: 'squat',
	targets: [{ id: ID, role: 'primary' }],
	...over
});

const contourOf = (exercises: readonly BankExercise[], over: Partial<Contour> = {}): Contour => ({
	exercises,
	id: ID,
	slug: 'contour',
	title: 'Контур',
	...over
});

const bankOf = (contours: readonly Contour[], zones?: readonly Zone[]): Bank => ({
	id: ID,
	rules: [],
	slug: 'calisthenics',
	title: 'Калистеника',
	zones: zones ?? [{ contours, id: ID, slug: 'zone', title: 'Зона' }]
});

const strengthBank: Bank = {
	id: ID,
	rules: [],
	slug: 'strength',
	title: 'Сила',
	zones: [{ contours: [], id: ID, slug: 'zone', title: 'Зона' }]
};

const catalogWith = (banks: readonly Bank[]): Catalog => ({ banks, equipment: [], targets: [] });
const filled = bankOf([contourOf([exerciseOf()])]);

describe('filledContours', () => {
	it('находит пустой контур', () => {
		const bank = bankOf([contourOf([])]);
		expect(filledContours(bank)).toHaveLength(1);
	});

	it('молчит на непустом контуре', () => {
		expect(filledContours(filled)).toEqual([]);
	});
});

describe('pickWithinContourBank', () => {
	it('молчит, когда банк не меньше pick', () => {
		const bank = bankOf([contourOf([exerciseOf()], { pick: 1 })]);
		expect(pickWithinContourBank(bank)).toEqual([]);
	});

	it('находит pick больше банка', () => {
		const bank = bankOf([contourOf([exerciseOf()], { pick: 2 })]);
		expect(pickWithinContourBank(bank)).toHaveLength(1);
	});

	it('находит отсутствующий pick', () => {
		expect(pickWithinContourBank(filled)).toHaveLength(1);
	});
});

describe('russianNames', () => {
	it('находит латиницу в имени', () => {
		const bank = bankOf([contourOf([exerciseOf({ name: 'Couch stretch' })])]);
		expect(russianNames(bank)[0]?.rule).toBe('R4 NAMES');
	});

	it('молчит на кириллице', () => {
		expect(russianNames(filled)).toEqual([]);
	});
});

describe('singleDosePerRecord', () => {
	it('находит составную дозу', () => {
		const bank = bankOf([contourOf([exerciseOf({ dose: '3×12+2×20' })])]);
		expect(singleDosePerRecord(bank)).toHaveLength(1);
	});

	it('молчит на дозе со стороной', () => {
		const bank = bankOf([contourOf([exerciseOf({ dose: '8/сторона' })])]);
		expect(singleDosePerRecord(bank)).toEqual([]);
	});
});

describe('singleMovementAllowingPerSide', () => {
	it('находит склейку в имени', () => {
		const bank = bankOf([contourOf([exerciseOf({ name: 'Жим и тяга' })])]);
		expect(singleMovementAllowingPerSide(bank)).toHaveLength(1);
	});

	it('разрешает суффикс стороны', () => {
		const bank = bankOf([contourOf([exerciseOf({ name: 'Планка/сторона' })])]);
		expect(singleMovementAllowingPerSide(bank)).toEqual([]);
	});
});

describe('singleMovementPerRecord', () => {
	it('находит склейку в имени', () => {
		const bank = bankOf([contourOf([exerciseOf({ name: '90/90' })])]);
		expect(singleMovementPerRecord(bank)[0]?.rule).toBe('R1 SRP');
	});

	it('молчит на одиночном движении', () => {
		expect(singleMovementPerRecord(filled)).toEqual([]);
	});
});

describe('uniqueRecords', () => {
	it('находит дубль id', () => {
		const twin = exerciseOf({ name: 'Выпады', slug: 'lunge' });
		const bank = bankOf([contourOf([exerciseOf(), twin])]);
		const findings = uniqueRecords(bank);
		expect(findings).toHaveLength(1);
		expect(findings[0]?.rule).toBe('R2 UNIQUE');
	});

	it('находит дубль нормализованного имени', () => {
		const twin = exerciseOf({ id: OTHER_ID, name: 'приседания!' });
		const bank = bankOf([contourOf([exerciseOf(), twin])]);
		expect(uniqueRecords(bank)).toHaveLength(1);
	});

	it('молчит на разных записях', () => {
		const twin = exerciseOf({ id: OTHER_ID, name: 'Выпады' });
		const bank = bankOf([contourOf([exerciseOf(), twin])]);
		expect(uniqueRecords(bank)).toEqual([]);
	});
});

describe('zonesMatchStrengthBank', () => {
	const catalog = catalogWith([strengthBank]);

	it('молчит, когда зоны совпадают с силовым банком', () => {
		expect(zonesMatchStrengthBank(filled, catalog)).toEqual([]);
	});

	it('находит другой набор slug зон', () => {
		const bank = bankOf([], [{ contours: [], id: ID, slug: 'other', title: 'Зона' }]);
		expect(zonesMatchStrengthBank(bank, catalog)).toHaveLength(1);
	});

	it('находит другие названия зон', () => {
		const bank = bankOf([], [{ contours: [], id: ID, slug: 'zone', title: 'Другая' }]);
		expect(zonesMatchStrengthBank(bank, catalog)).toHaveLength(1);
	});

	it('находит отсутствие силового банка', () => {
		expect(zonesMatchStrengthBank(filled, catalogWith([]))).toHaveLength(2);
	});
});
