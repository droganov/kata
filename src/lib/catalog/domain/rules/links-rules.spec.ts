import { describe, expect, it } from 'vitest';

import type { Bank, BankExercise, BankSlug, EquipmentRole, TargetRole } from '../bank.ts';
import type { Catalog } from '../catalog.ts';
import type { Equipment } from '../equipment.ts';

import { uuidOf } from '../../../shared/uuid.ts';
import {
	equipmentBackLinksSymmetric,
	equipmentRefsValid,
	equipmentRolesValid,
	nameMentionsOwnedGear,
	sameNameSameLinks,
	targetKindMatchesBank,
	targetRefsValid
} from './links-rules.ts';

const BODY_ID = uuidOf('01a0889d-3852-7051-a039-c9778729a468');
const BENCH_ID = uuidOf('01a0889d-3800-7ef5-adfd-a56bcb2334c5');
const CABLE_ID = uuidOf('01a0889d-3801-7b23-aa1c-1b5a6a9cbe52');
const MUSCLE_ID = uuidOf('01a0889d-3802-753e-bdf1-bd3e6c3086b0');
const JOINT_ID = uuidOf('01a0889d-3845-7b73-adc5-6b00a88f5523');
const EXERCISE_ID = uuidOf('01a0889d-4423-7162-a9b4-f38de9ce3ea4');
const TWIN_ID = uuidOf('01a0889d-6000-7466-95f5-8ecc456410c5');
const UNKNOWN_ID = uuidOf('01a0889d-9999-7466-95f5-8ecc456410c5');

const equipmentOf = (over: Partial<Equipment> = {}): Equipment => ({
	canon_en: 'Bodyweight',
	exercises: [EXERCISE_ID],
	id: BODY_ID,
	kind: 'body',
	name: 'Тело',
	slug: 'body',
	...over
});

const bench = equipmentOf({
	canon_en: 'Flat bench',
	exercises: [],
	id: BENCH_ID,
	kind: 'apparatus',
	name: 'Скамья',
	slug: 'bench_flat'
});

const cable = equipmentOf({
	canon_en: 'Cable station',
	exercises: [],
	id: CABLE_ID,
	kind: 'machine',
	name: 'Блочная стойка',
	slug: 'cable_station'
});

const catalogOf = (equipment: readonly Equipment[]): Catalog => ({
	banks: [],
	equipment,
	targets: [
		{
			group: 'neck',
			id: MUSCLE_ID,
			kind: 'muscle',
			latin: 'Sternocleidomastoid',
			name: 'ГКС',
			slug: 'sternocleidomastoid',
			zone: 'neck'
		},
		{
			id: JOINT_ID,
			kind: 'joint',
			latin: 'Cervical spine',
			name: 'Шейный отдел',
			slug: 'cervical_spine',
			zone: 'neck'
		}
	]
});

const catalog = catalogOf([equipmentOf(), bench, cable]);

const exerciseOf = (over: Partial<BankExercise> = {}): BankExercise => ({
	constraints: { axial: false, free_weight: false, lumbar_ext: false, lumbar_flex: false },
	dose: '3×12',
	equipment: [{ id: BODY_ID, role: 'main' }],
	id: EXERCISE_ID,
	mode: 'loaded',
	name: 'Сгибание шеи лёжа',
	slug: 'neck_flex',
	targets: [{ id: MUSCLE_ID, role: 'primary' }],
	...over
});

const bankOf = (exercises: readonly BankExercise[], slug: BankSlug = 'strength'): Bank => ({
	id: BODY_ID,
	rules: [],
	slug,
	title: 'Банк',
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

describe('equipmentRefsValid', () => {
	it('молчит на исправной записи', () => {
		expect(equipmentRefsValid(plain, catalog)).toEqual([]);
	});

	it('находит отсутствие средств', () => {
		const bank = bankOf([exerciseOf({ equipment: [] })]);
		const messages = equipmentRefsValid(bank, catalog).map((finding) => finding.message);
		expect(messages).toContain('Сгибание шеи лёжа: нет средств');
	});

	it('находит два главных средства', () => {
		const bank = bankOf([
			exerciseOf({
				equipment: [
					{ id: BODY_ID, role: 'main' },
					{ id: BENCH_ID, role: 'main' }
				]
			})
		]);
		expect(equipmentRefsValid(bank, catalog)[0]?.message).toContain('главных средств 2');
	});

	it('находит неизвестное средство', () => {
		const bank = bankOf([exerciseOf({ equipment: [{ id: UNKNOWN_ID, role: 'main' }] })]);
		expect(equipmentRefsValid(bank, catalog)[0]?.message).toContain('неизвестные средства');
	});

	it('находит повтор средства', () => {
		const bank = bankOf([
			exerciseOf({
				equipment: [
					{ id: BODY_ID, role: 'main' },
					{ id: BODY_ID, role: 'auxiliary' }
				]
			})
		]);
		expect(equipmentRefsValid(bank, catalog)[0]?.message).toContain('повтор средства');
	});
});

describe('equipmentRolesValid', () => {
	it('молчит на известных ролях', () => {
		expect(equipmentRolesValid(plain)).toEqual([]);
	});

	it('находит чужую роль средства', () => {
		const role = 'главное' as unknown as EquipmentRole;
		const bank = bankOf([exerciseOf({ equipment: [{ id: BODY_ID, role }] })]);
		expect(equipmentRolesValid(bank)[0]?.rule).toBe('L2 ROLE_E');
	});
});

describe('targetRefsValid', () => {
	it('молчит на исправной записи', () => {
		expect(targetRefsValid(plain, catalog)).toEqual([]);
	});

	it('находит отсутствие целей', () => {
		const bank = bankOf([exerciseOf({ targets: [] })]);
		const messages = targetRefsValid(bank, catalog).map((finding) => finding.message);
		expect(messages).toContain('Сгибание шеи лёжа: нет целей');
	});

	it('находит отсутствие основной цели', () => {
		const bank = bankOf([exerciseOf({ targets: [{ id: MUSCLE_ID, role: 'secondary' }] })]);
		expect(targetRefsValid(bank, catalog)[0]?.message).toContain('нет основной цели');
	});

	it('находит неизвестную цель', () => {
		const bank = bankOf([exerciseOf({ targets: [{ id: UNKNOWN_ID, role: 'primary' }] })]);
		expect(targetRefsValid(bank, catalog)[0]?.message).toContain('неизвестные цели');
	});

	it('находит чужую роль цели', () => {
		const role = 'основная' as unknown as TargetRole;
		const bank = bankOf([
			exerciseOf({
				targets: [
					{ id: MUSCLE_ID, role: 'primary' },
					{ id: JOINT_ID, role }
				]
			})
		]);
		expect(targetRefsValid(bank, catalog)[0]?.message).toContain('роль цели');
	});

	it('находит повтор цели', () => {
		const bank = bankOf([
			exerciseOf({
				targets: [
					{ id: MUSCLE_ID, role: 'primary' },
					{ id: MUSCLE_ID, role: 'secondary' }
				]
			})
		]);
		expect(targetRefsValid(bank, catalog)[0]?.message).toContain('повтор цели');
	});
});

describe('targetKindMatchesBank', () => {
	const jointExercise = exerciseOf({ targets: [{ id: JOINT_ID, role: 'primary' }] });

	it('принимает мышцу в силовом банке', () => {
		expect(targetKindMatchesBank(plain, catalog)).toEqual([]);
	});

	it('находит сустав в силовом банке', () => {
		const bank = bankOf([jointExercise]);
		expect(targetKindMatchesBank(bank, catalog)[0]?.rule).toBe('L4 KIND');
	});

	it('принимает сустав в разминке', () => {
		const bank = bankOf([jointExercise], 'warmup');
		expect(targetKindMatchesBank(bank, catalog)).toEqual([]);
	});

	it('пропускает неизвестную цель', () => {
		const bank = bankOf([exerciseOf({ targets: [{ id: UNKNOWN_ID, role: 'primary' }] })]);
		expect(targetKindMatchesBank(bank, catalog)).toEqual([]);
	});
});

describe('nameMentionsOwnedGear', () => {
	it('молчит, когда имя не упоминает снарядов', () => {
		expect(nameMentionsOwnedGear(plain, catalog)).toEqual([]);
	});

	it('находит гантели без средства по slug', () => {
		const bank = bankOf([exerciseOf({ name: 'Жим гантелей лёжа' })]);
		expect(nameMentionsOwnedGear(bank, catalog)[0]?.message).toContain('гантел');
	});

	it('принимает скамью по префиксу средства', () => {
		const bank = bankOf([
			exerciseOf({
				equipment: [
					{ id: BODY_ID, role: 'main' },
					{ id: BENCH_ID, role: 'auxiliary' }
				],
				name: 'Жим на скамье'
			})
		]);
		expect(nameMentionsOwnedGear(bank, catalog)).toEqual([]);
	});

	it('находит скамью без средства-скамьи', () => {
		const bank = bankOf([exerciseOf({ name: 'Жим на скамье' })]);
		expect(nameMentionsOwnedGear(bank, catalog)).toHaveLength(1);
	});

	it('принимает блок по виду средства', () => {
		const bank = bankOf([
			exerciseOf({ equipment: [{ id: CABLE_ID, role: 'main' }], name: 'Тяга на блоке' })
		]);
		expect(nameMentionsOwnedGear(bank, catalog)).toEqual([]);
	});

	it('не считает неизвестное средство своим', () => {
		const bank = bankOf([
			exerciseOf({ equipment: [{ id: UNKNOWN_ID, role: 'main' }], name: 'Тяга на блоке' })
		]);
		expect(nameMentionsOwnedGear(bank, catalog)).toHaveLength(1);
	});
});

describe('sameNameSameLinks', () => {
	it('молчит, когда одноимённые записи связаны одинаково', () => {
		const bank = bankOf([exerciseOf(), exerciseOf({ id: TWIN_ID })]);
		expect(sameNameSameLinks(bank)).toEqual([]);
	});

	it('находит расхождение связей у одноимённых записей', () => {
		const twin = exerciseOf({ equipment: [{ id: BENCH_ID, role: 'main' }], id: TWIN_ID });
		const bank = bankOf([exerciseOf(), twin]);
		expect(sameNameSameLinks(bank)[0]?.rule).toBe('L6 SAME');
	});
});

describe('equipmentBackLinksSymmetric', () => {
	it('молчит на симметричных связях', () => {
		expect(equipmentBackLinksSymmetric(plain, catalog)).toEqual([]);
	});

	it('находит средство без обратной ссылки', () => {
		const bank = bankOf([
			exerciseOf({
				equipment: [
					{ id: BODY_ID, role: 'main' },
					{ id: BENCH_ID, role: 'auxiliary' }
				]
			})
		]);
		const findings = equipmentBackLinksSymmetric(bank, catalog);
		expect(findings[0]?.message).toContain('средство не знает упражнения');
	});

	it('находит ссылку средства без обратной связи записи', () => {
		const single = catalogOf([equipmentOf({ exercises: [EXERCISE_ID, TWIN_ID] })]);
		const twin = exerciseOf({ equipment: [], id: TWIN_ID });
		const findings = equipmentBackLinksSymmetric(bankOf([exerciseOf(), twin]), single);
		expect(findings[0]?.message).toContain('обратной связи нет');
	});

	it('пропускает неизвестное средство', () => {
		const empty = catalogOf([equipmentOf({ exercises: [] })]);
		const bank = bankOf([exerciseOf({ equipment: [{ id: UNKNOWN_ID, role: 'main' }] })]);
		expect(equipmentBackLinksSymmetric(bank, empty)).toEqual([]);
	});
});
