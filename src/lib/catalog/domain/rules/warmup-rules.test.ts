import { describe, expect, it } from 'vitest';

import type { Bank, BankExercise } from '../bank.ts';

import { uuidOf } from '../../../shared/uuid.ts';
import {
	warmupBodyOnly,
	warmupDoseFormat,
	warmupDynamicOnly,
	warmupSessionTime,
	warmupSpineSafety
} from './warmup-rules.ts';

const ID = uuidOf('01a0889d-3852-7051-a039-c9778729a468');
const BUDGET = 420;

interface BankShape {
	readonly hasBudget?: boolean;
	readonly hasPick?: boolean;
	readonly pick?: number;
}

const exerciseOf = (over: Partial<BankExercise> = {}): BankExercise => ({
	constraints: { axial: false, free_weight: false, lumbar_ext: false, lumbar_flex: false },
	dose: '8',
	equipment: [{ id: ID, role: 'main' }],
	id: ID,
	mode: 'dynamic',
	name: 'Наклоны головы',
	seconds: 20,
	slug: 'neck_flex',
	targets: [{ id: ID, role: 'primary' }],
	...over
});

const withoutSeconds = (): BankExercise => {
	const { seconds, ...rest } = exerciseOf();
	expect(seconds).toBe(20);
	return rest;
};

const bankOf = (exercises: readonly BankExercise[], shape: BankShape = {}): Bank => ({
	id: ID,
	rules: [],
	...(shape.hasBudget !== false && { session_budget_sec: BUDGET }),
	slug: 'warmup',
	title: 'Разминка',
	zones: [
		{
			contours: [
				{
					exercises,
					id: ID,
					...(shape.hasPick !== false && { pick: shape.pick ?? 1 }),
					slug: 'contour',
					title: 'Контур'
				}
			],
			id: ID,
			slug: 'zone',
			title: 'Зона'
		}
	]
});

const plain = bankOf([exerciseOf()]);

describe('warmupDoseFormat', () => {
	it('принимает разрешённые формы дозы', () => {
		const doses = [
			'8',
			'8/сторона',
			'по 8 в каждую сторону',
			'по 8 в каждую сторону, каждая нога'
		];
		const bank = bankOf(doses.map((dose) => exerciseOf({ dose })));
		expect(warmupDoseFormat(bank)).toEqual([]);
	});

	it('принимает секунды и шаги', () => {
		const bank = bankOf([exerciseOf({ dose: '20 с' }), exerciseOf({ dose: '20 шагов' })]);
		expect(warmupDoseFormat(bank)).toEqual([]);
	});

	it('находит дозу силового вида', () => {
		const bank = bankOf([exerciseOf({ dose: '2×20 шагов' })]);
		expect(warmupDoseFormat(bank)[0]?.rule).toBe('R5 DOSE');
	});
});

describe('warmupDynamicOnly', () => {
	it('молчит на коротком движении', () => {
		expect(warmupDynamicOnly(plain)).toEqual([]);
	});

	it('находит удержание дольше минуты', () => {
		const bank = bankOf([exerciseOf({ seconds: 90 })]);
		expect(warmupDynamicOnly(bank)).toHaveLength(1);
	});

	it('находит запись без секунд', () => {
		const bank = bankOf([withoutSeconds()]);
		expect(warmupDynamicOnly(bank)).toHaveLength(1);
	});
});

describe('warmupSpineSafety', () => {
	it('находит запрещённый паттерн спины', () => {
		const bank = bankOf([exerciseOf({ name: 'Скручивания корпуса' })]);
		expect(warmupSpineSafety(bank)[0]?.rule).toBe('R7 SPINE');
	});

	it('молчит на безопасном имени', () => {
		expect(warmupSpineSafety(plain)).toEqual([]);
	});
});

describe('warmupBodyOnly', () => {
	it('находит упоминание снаряда', () => {
		const bank = bankOf([exerciseOf({ name: 'Махи с гантелями' })]);
		expect(warmupBodyOnly(bank)[0]?.rule).toBe('R9 NO_GEAR');
	});

	it('молчит, когда работает только тело', () => {
		expect(warmupBodyOnly(plain)).toEqual([]);
	});
});

describe('warmupSessionTime', () => {
	it('молчит, когда занятие укладывается в бюджет', () => {
		expect(warmupSessionTime(plain)).toEqual([]);
	});

	it('находит перерасход бюджета', () => {
		const bank = bankOf([exerciseOf({ seconds: 60 })], { pick: 10 });
		expect(warmupSessionTime(bank)[0]?.message).toContain('600 с при бюджете 420 с');
	});

	it('считает контур без pick и запись без секунд нулевым временем', () => {
		const bank = bankOf([withoutSeconds()], { hasPick: false });
		expect(warmupSessionTime(bank)).toEqual([]);
	});

	it('считает отсутствующий бюджет нулевым', () => {
		const bank = bankOf([exerciseOf()], { hasBudget: false });
		expect(warmupSessionTime(bank)).toHaveLength(1);
	});
});
