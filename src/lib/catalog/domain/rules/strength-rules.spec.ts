import { describe, expect, it } from 'vitest';

import type { Bank, BankExercise, ExerciseConstraints } from '../bank.ts';
import type { Catalog } from '../catalog.ts';

import { uuidOf } from '../../../shared/uuid.ts';
import {
	strengthDoseFormat,
	strengthLoadedMode,
	strengthSpineSafety,
	strengthWeightLimit
} from './strength-rules.ts';

const BODY_ID = uuidOf('01a0889d-3852-7051-a039-c9778729a468');
const PLATE_ID = uuidOf('01a0889d-3800-7ef5-adfd-a56bcb2334c5');
const ERECTORS = 'erectors_lumbar';
const CLEAR: ExerciseConstraints = {
	axial: false,
	free_weight: false,
	lumbar_ext: false,
	lumbar_flex: false
};

const catalog: Catalog = {
	banks: [],
	equipment: [
		{
			canon_en: 'Bodyweight',
			exercises: [],
			id: BODY_ID,
			kind: 'body',
			name: 'Тело',
			slug: 'body'
		},
		{
			canon_en: 'Plate',
			exercises: [],
			id: PLATE_ID,
			kind: 'free_weight',
			name: 'Блин',
			slug: 'plate'
		}
	],
	targets: []
};

const exerciseOf = (over: Partial<BankExercise> = {}): BankExercise => ({
	constraints: CLEAR,
	dose: '3×12–15',
	equipment: [{ id: BODY_ID, role: 'main' }],
	id: BODY_ID,
	mode: 'loaded',
	name: 'Жим на тренажёре',
	slug: 'press',
	targets: [{ id: BODY_ID, role: 'primary' }],
	...over
});

const bankOf = (exercises: readonly BankExercise[], contourSlug = 'contour'): Bank => ({
	id: BODY_ID,
	rules: [],
	slug: 'strength',
	title: 'Сила',
	zones: [
		{
			contours: [{ exercises, id: BODY_ID, slug: contourSlug, title: 'Контур' }],
			id: BODY_ID,
			slug: 'zone',
			title: 'Зона'
		}
	]
});

const plain = bankOf([exerciseOf()]);

describe('strengthDoseFormat', () => {
	it('принимает подходы с диапазоном и стороной', () => {
		const doses = ['3×12–15', '2×15', '3×20 м/сторона', '3×20 шагов'];
		const bank = bankOf(doses.map((dose) => exerciseOf({ dose })));
		expect(strengthDoseFormat(bank)).toEqual([]);
	});

	it('находит дозу в секундах', () => {
		const bank = bankOf([exerciseOf({ dose: '3×30с' })]);
		expect(strengthDoseFormat(bank)[0]?.rule).toBe('R5 DOSE');
	});
});

describe('strengthLoadedMode', () => {
	it('молчит на режиме loaded', () => {
		expect(strengthLoadedMode(plain)).toEqual([]);
	});

	it('находит чужой режим', () => {
		const bank = bankOf([exerciseOf({ mode: 'isometric' })]);
		expect(strengthLoadedMode(bank)).toHaveLength(1);
	});
});

describe('strengthSpineSafety', () => {
	it('молчит на безопасной записи', () => {
		expect(strengthSpineSafety(plain)).toEqual([]);
	});

	it('находит флаг спины', () => {
		const bank = bankOf([exerciseOf({ constraints: { ...CLEAR, axial: true } })]);
		expect(strengthSpineSafety(bank)[0]?.message).toContain('флаг спины');
	});

	it('находит запрещённый паттерн', () => {
		const bank = bankOf([exerciseOf({ name: 'Становая тяга' })]);
		expect(strengthSpineSafety(bank)[0]?.message).toContain('запрещённый паттерн');
	});

	it('требует амплитуду до нейтрали в контуре разгибателей', () => {
		const bank = bankOf([exerciseOf()], ERECTORS);
		expect(strengthSpineSafety(bank)[0]?.message).toContain('до нейтрали');
	});

	it('принимает заметку про нейтраль в контуре разгибателей', () => {
		const bank = bankOf([exerciseOf({ note: 'поясница не прогибается' })], ERECTORS);
		expect(strengthSpineSafety(bank)).toEqual([]);
	});
});

describe('strengthWeightLimit', () => {
	it('молчит, когда свободного веса нет', () => {
		expect(strengthWeightLimit(plain, catalog)).toEqual([]);
	});

	it('принимает свободный вес до предела', () => {
		const exercise = exerciseOf({
			constraints: { ...CLEAR, free_weight: true, kg_max: 10 },
			equipment: [
				{ id: BODY_ID, role: 'main' },
				{ id: PLATE_ID, role: 'auxiliary' }
			]
		});
		expect(strengthWeightLimit(bankOf([exercise]), catalog)).toEqual([]);
	});

	it('находит превышение предела', () => {
		const exercise = exerciseOf({
			constraints: { ...CLEAR, free_weight: true, kg_max: 20 },
			equipment: [{ id: PLATE_ID, role: 'main' }]
		});
		const findings = strengthWeightLimit(bankOf([exercise]), catalog);
		expect(findings[0]?.message).toContain('свободный вес больше 10 кг');
	});

	it('находит несогласованность флага и средств', () => {
		const exercise = exerciseOf({ equipment: [{ id: PLATE_ID, role: 'main' }] });
		const findings = strengthWeightLimit(bankOf([exercise]), catalog);
		expect(findings[0]?.message).toContain('free_weight=false');
	});

	it('находит свободный вес без указанного предела', () => {
		const exercise = exerciseOf({
			constraints: { ...CLEAR, free_weight: true },
			equipment: [{ id: PLATE_ID, role: 'main' }]
		});
		expect(strengthWeightLimit(bankOf([exercise]), catalog)).toHaveLength(1);
	});
});
