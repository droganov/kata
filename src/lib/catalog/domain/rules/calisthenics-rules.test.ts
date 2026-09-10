import { describe, expect, it } from 'vitest';

import type { Bank, BankExercise, ExerciseConstraints } from '../bank.ts';
import type { Catalog } from '../catalog.ts';

import { uuidOf } from '../../../shared/uuid.ts';
import {
	calisthenicsDoseFormat,
	calisthenicsMainGearKind,
	calisthenicsModeMatchesDose,
	calisthenicsSpineSafety
} from './calisthenics-rules.ts';

const BODY_ID = uuidOf('01a0889d-3852-7051-a039-c9778729a468');
const CABLE_ID = uuidOf('01a0889d-3800-7ef5-adfd-a56bcb2334c5');
const UNKNOWN_ID = uuidOf('01a0889d-3801-7b23-aa1c-1b5a6a9cbe52');
const ERECTORS = 'erectors_thoracic';
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
			canon_en: 'Cable station',
			exercises: [],
			id: CABLE_ID,
			kind: 'machine',
			name: 'Блочная стойка',
			slug: 'cable_station'
		}
	],
	targets: []
};

const exerciseOf = (over: Partial<BankExercise> = {}): BankExercise => ({
	constraints: CLEAR,
	dose: '3×10с',
	equipment: [{ id: BODY_ID, role: 'main' }],
	id: BODY_ID,
	mode: 'isometric',
	name: 'Давление лбом в ладонь',
	slug: 'nk_front_iso',
	targets: [{ id: BODY_ID, role: 'primary' }],
	...over
});

const bankOf = (exercises: readonly BankExercise[], contourSlug = 'contour'): Bank => ({
	id: BODY_ID,
	rules: [],
	slug: 'calisthenics',
	title: 'Калистеника',
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

describe('calisthenicsDoseFormat', () => {
	it('принимает секунды, повторы, метры и шаги', () => {
		const doses = ['3×10с', '3×12', '3×12–15', '3×20 м', '3×20 шагов/сторона'];
		const bank = bankOf(doses.map((dose) => exerciseOf({ dose })));
		expect(calisthenicsDoseFormat(bank)).toEqual([]);
	});

	it('находит перевёрнутую дозу', () => {
		const bank = bankOf([exerciseOf({ dose: '15с × 4' })]);
		expect(calisthenicsDoseFormat(bank)[0]?.rule).toBe('R5 DOSE');
	});
});

describe('calisthenicsModeMatchesDose', () => {
	it('молчит, когда удержание совпадает с секундной дозой', () => {
		expect(calisthenicsModeMatchesDose(plain)).toEqual([]);
	});

	it('молчит, когда динамика совпадает с повторами', () => {
		const bank = bankOf([exerciseOf({ dose: '3×12', mode: 'calisthenic' })]);
		expect(calisthenicsModeMatchesDose(bank)).toEqual([]);
	});

	it('находит чужой режим', () => {
		const bank = bankOf([exerciseOf({ dose: '3×12', mode: 'loaded' })]);
		expect(calisthenicsModeMatchesDose(bank)).toHaveLength(1);
	});

	it('находит расхождение режима и дозы', () => {
		const bank = bankOf([exerciseOf({ dose: '3×12', mode: 'isometric' })]);
		const findings = calisthenicsModeMatchesDose(bank);
		expect(findings[0]?.message).toContain('не сходится с дозой');
	});
});

describe('calisthenicsSpineSafety', () => {
	it('молчит на безопасной записи', () => {
		expect(calisthenicsSpineSafety(plain)).toEqual([]);
	});

	it('находит флаг спины', () => {
		const bank = bankOf([exerciseOf({ constraints: { ...CLEAR, lumbar_flex: true } })]);
		expect(calisthenicsSpineSafety(bank)).toHaveLength(1);
	});

	it('находит запрещённый паттерн', () => {
		const bank = bankOf([exerciseOf({ name: 'Складка на полу' })]);
		expect(calisthenicsSpineSafety(bank)[0]?.message).toContain('запрещённый паттерн');
	});

	it('требует амплитуду до линии тела в контуре разгибателей', () => {
		const bank = bankOf([exerciseOf()], ERECTORS);
		expect(calisthenicsSpineSafety(bank)[0]?.message).toContain('до нейтрали');
	});

	it('принимает заметку про линию тела', () => {
		const bank = bankOf([exerciseOf({ note: 'подъём до линии тела' })], ERECTORS);
		expect(calisthenicsSpineSafety(bank)).toEqual([]);
	});
});

describe('calisthenicsMainGearKind', () => {
	it('принимает тело как главное средство', () => {
		expect(calisthenicsMainGearKind(plain, catalog)).toEqual([]);
	});

	it('находит тренажёр как главное средство', () => {
		const bank = bankOf([exerciseOf({ equipment: [{ id: CABLE_ID, role: 'main' }] })]);
		const findings = calisthenicsMainGearKind(bank, catalog);
		expect(findings[0]?.message).toContain('cable_station');
	});

	it('находит отсутствие главного средства', () => {
		const bank = bankOf([exerciseOf({ equipment: [{ id: UNKNOWN_ID, role: 'main' }] })]);
		expect(calisthenicsMainGearKind(bank, catalog)).toHaveLength(1);
	});
});
