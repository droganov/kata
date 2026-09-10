import { describe, expect, it } from 'vitest';

import type { Bank, BankExercise, Contour, Zone } from './bank.ts';
import type { Catalog } from './catalog.ts';

import { uuidOf } from '../../shared/uuid.ts';
import { bankInvariants } from './bank-invariants.ts';

const ID = uuidOf('01a0889d-3852-7051-a039-c9778729a468');
const TARGET_ID = uuidOf('01a0889d-3800-7ef5-adfd-a56bcb2334c5');
const UNKNOWN_ID = uuidOf('01a0889d-9999-7466-95f5-8ecc456410c5');

const catalog: Catalog = {
	banks: [],
	equipment: [
		{
			canon_en: 'Bodyweight',
			exercises: [],
			id: ID,
			kind: 'body',
			name: 'Тело',
			slug: 'body'
		}
	],
	targets: [
		{
			id: TARGET_ID,
			kind: 'muscle',
			latin: 'Sternocleidomastoid',
			name: 'ГКС',
			slug: 'sternocleidomastoid',
			zone: 'neck'
		}
	]
};

const exerciseOf = (over: Partial<BankExercise> = {}): BankExercise => ({
	constraints: { axial: false, free_weight: false, lumbar_ext: false, lumbar_flex: false },
	dose: '3×12',
	equipment: [{ id: ID, role: 'main' }],
	id: ID,
	mode: 'loaded',
	name: 'Сгибание шеи',
	slug: 'neck_flex',
	targets: [{ id: TARGET_ID, role: 'primary' }],
	...over
});

const contourOf = (exercises: readonly BankExercise[], slug = 'contour'): Contour => ({
	exercises,
	id: ID,
	slug,
	title: 'Контур'
});

const zoneOf = (contours: readonly Contour[], slug = 'zone'): Zone => ({
	contours,
	id: ID,
	slug,
	title: 'Зона'
});

const bankOf = (zones: readonly Zone[]): Bank => ({
	id: ID,
	rules: [],
	slug: 'strength',
	title: 'Сила',
	zones
});

const bankWith = (exercises: readonly BankExercise[]): Bank => {
	const contour = contourOf(exercises);
	return bankOf([zoneOf([contour])]);
};

describe('bankInvariants', () => {
	it('молчит на исправном банке', () => {
		const bank = bankWith([exerciseOf()]);
		expect(bankInvariants(bank, catalog)).toEqual([]);
	});

	it('находит повтор slug зоны', () => {
		const first = zoneOf([contourOf([exerciseOf()])]);
		const second = zoneOf([contourOf([exerciseOf()], 'second')]);
		const findings = bankInvariants(bankOf([first, second]), catalog);
		expect(findings[0]?.rule).toBe('I1 ZONE_SLUG');
	});

	it('находит повтор slug контура', () => {
		const zone = zoneOf([contourOf([exerciseOf()]), contourOf([exerciseOf()])]);
		const findings = bankInvariants(bankOf([zone]), catalog);
		expect(findings[0]?.rule).toBe('I2 CONTOUR_SLUG');
	});

	it('находит пустой контур', () => {
		const findings = bankInvariants(bankWith([]), catalog);
		expect(findings[0]?.rule).toBe('I3 CONTOUR_FILLED');
	});

	it('находит запись без главного средства', () => {
		const bank = bankWith([exerciseOf({ equipment: [{ id: ID, role: 'auxiliary' }] })]);
		expect(bankInvariants(bank, catalog)[0]?.rule).toBe('I4 MAIN_EQUIPMENT');
	});

	it('находит висячую ссылку на средство', () => {
		const bank = bankWith([exerciseOf({ equipment: [{ id: UNKNOWN_ID, role: 'main' }] })]);
		expect(bankInvariants(bank, catalog)[0]?.rule).toBe('I5 REFERENCES');
	});

	it('находит висячую ссылку на цель', () => {
		const bank = bankWith([exerciseOf({ targets: [{ id: UNKNOWN_ID, role: 'primary' }] })]);
		expect(bankInvariants(bank, catalog)[0]?.message).toContain('висячие ссылки');
	});
});
