import { describe, expect, it } from 'vitest';

import type { Bank, BankExercise, ExerciseConstraints } from '../bank.ts';
import type { Catalog } from '../catalog.ts';

import { uuidOf } from '../../../shared/uuid.ts';
import {
	stretchBodyOnly,
	stretchDoseFormat,
	stretchHowToNote,
	stretchSpineSafety,
	stretchStaticMode
} from './stretch-rules.ts';

const BODY_ID = uuidOf('01a0889d-3852-7051-a039-c9778729a468');
const STRAP_ID = uuidOf('01a0889d-3800-7ef5-adfd-a56bcb2334c5');
const UNKNOWN_ID = uuidOf('01a0889d-3801-7b23-aa1c-1b5a6a9cbe52');
const NOTE = 'Сидя ровно, плечи вниз, медленно поднять подбородок до натяжения.';
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
			canon_en: 'Strap',
			exercises: [],
			id: STRAP_ID,
			kind: 'tool',
			name: 'Ремень',
			slug: 'strap'
		}
	],
	targets: []
};

const exerciseOf = (over: Partial<BankExercise> = {}): BankExercise => ({
	constraints: CLEAR,
	dose: '2×20с',
	equipment: [{ id: BODY_ID, role: 'main' }],
	id: BODY_ID,
	mode: 'static_stretch',
	name: 'Запрокидывание головы назад сидя',
	note: NOTE,
	slug: 'st_nk_ext',
	targets: [{ id: BODY_ID, role: 'primary' }],
	...over
});

const withoutNote = (): BankExercise => {
	const { note, ...rest } = exerciseOf();
	expect(note).toBe(NOTE);
	return rest;
};

const bankOf = (exercises: readonly BankExercise[]): Bank => ({
	id: BODY_ID,
	rules: [],
	slug: 'stretch',
	title: 'Растяжка',
	zones: [
		{
			contours: [{ exercises, id: BODY_ID, slug: 'contour', title: 'Контур' }],
			id: BODY_ID,
			slug: 'zone',
			title: 'Зона'
		}
	]
});

const plain = bankOf([exerciseOf()]);

describe('stretchDoseFormat', () => {
	it('принимает подходы по секундам', () => {
		const bank = bankOf([exerciseOf({ dose: '2×20с' }), exerciseOf({ dose: '2×40с/сторона' })]);
		expect(stretchDoseFormat(bank)).toEqual([]);
	});

	it('находит перевёрнутую дозу', () => {
		const bank = bankOf([exerciseOf({ dose: '40с × 2' })]);
		expect(stretchDoseFormat(bank)[0]?.rule).toBe('R5 DOSE');
	});
});

describe('stretchStaticMode', () => {
	it('молчит на статической растяжке', () => {
		expect(stretchStaticMode(plain)).toEqual([]);
	});

	it('находит чужой режим', () => {
		const bank = bankOf([exerciseOf({ mode: 'dynamic' })]);
		expect(stretchStaticMode(bank)).toHaveLength(1);
	});
});

describe('stretchSpineSafety', () => {
	it('молчит на безопасной записи', () => {
		expect(stretchSpineSafety(plain)).toEqual([]);
	});

	it('находит флаг спины', () => {
		const bank = bankOf([exerciseOf({ constraints: { ...CLEAR, lumbar_ext: true } })]);
		expect(stretchSpineSafety(bank)).toHaveLength(1);
	});

	it('находит запрещённый паттерн', () => {
		const bank = bankOf([exerciseOf({ name: 'Складка сидя' })]);
		expect(stretchSpineSafety(bank)[0]?.message).toContain('запрещённый паттерн');
	});
});

describe('stretchBodyOnly', () => {
	it('принимает тело как главное средство', () => {
		expect(stretchBodyOnly(plain, catalog)).toEqual([]);
	});

	it('находит инвентарь как главное средство', () => {
		const bank = bankOf([exerciseOf({ equipment: [{ id: STRAP_ID, role: 'main' }] })]);
		expect(stretchBodyOnly(bank, catalog)[0]?.message).toContain('strap');
	});

	it('находит отсутствие главного средства', () => {
		const bank = bankOf([exerciseOf({ equipment: [{ id: UNKNOWN_ID, role: 'main' }] })]);
		expect(stretchBodyOnly(bank, catalog)).toHaveLength(1);
	});
});

describe('stretchHowToNote', () => {
	it('принимает подробную заметку', () => {
		expect(stretchHowToNote(plain)).toEqual([]);
	});

	it('находит короткую заметку', () => {
		const bank = bankOf([exerciseOf({ note: 'коротко' })]);
		expect(stretchHowToNote(bank)).toHaveLength(1);
	});

	it('находит запись без заметки', () => {
		const bank = bankOf([withoutNote()]);
		expect(stretchHowToNote(bank)[0]?.rule).toBe('R10 NOTE');
	});
});
