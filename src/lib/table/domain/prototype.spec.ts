import { describe, expect, it } from 'vitest';

import { catalogWithProgram, PROGRAM_ID, programBlocks } from '../../../test/table-fixtures.ts';
import { tablesOf } from './convert.ts';

const tables = tablesOf(catalogWithProgram(), programBlocks());

describe('архив прототипа', () => {
	it('хранит файлы каталога и связь каждого Блока со своим файлом и названием', () => {
		expect(tables.prototype_bank.map((row) => [row.id, row.slug, row.title])).toEqual([
			['file-cardio', 'cardio', 'Разогрев'],
			['file-warmup', 'warmup', 'Разминка'],
			['file-strength', 'strength', 'Силовой']
		]);
		expect(tables.prototype_section).toContainEqual({
			bank_id: 'file-strength',
			block_id: 'section-strength',
			title: 'Силовой'
		});
	});

	it('хранит зоны по порядку с Группой мышц, когда slug её называет', () => {
		expect(
			tables.prototype_zone.map((row) => [
				row.bank_id,
				row.ord,
				row.slug,
				row.muscle_group_id
			])
		).toEqual([
			['file-cardio', 1, 'cardio', null],
			['file-warmup', 1, 'neck', 'group-neck'],
			['file-strength', 1, 'neck', 'group-neck'],
			['file-strength', 2, 'back', 'group-back']
		]);
	});

	it('хранит контуры с их Мишенью, названием и числом, упражнения по порядку с процедурой', () => {
		expect(tables.prototype_contour).toContainEqual({
			id: 'catalog-target-cervical',
			ord: 1,
			pick: 4,
			slug: 'cervical',
			target_id: '01a0889d-3845-7b73-adc5-6b00a88f5523',
			title: 'шейный отдел',
			zone_id: 'group-warmup-neck'
		});
		expect(tables.prototype_contour.find((row) => row.slug === 'lats')?.pick).toBeNull();
		expect(tables.prototype_contour_exercise).toContainEqual({
			contour_id: 'catalog-target-lats',
			exercise_id: 'ex-lats-1',
			ord: 1,
			procedure_id: 'procedure-pulldown'
		});
	});

	it('хранит слоты секций с кандидатами по порядку', () => {
		expect(tables.prototype_slot).toContainEqual({
			allow_repeat: null,
			block_id: 'section-strength',
			id: 'slot-pool',
			kind: 'pool',
			label: 'Тяга',
			ord: 2,
			pick: 1,
			rule: 'правило из slots[]',
			sec_each: 60
		});
		expect(tables.prototype_slot.find((row) => row.id === 'slot-cardio')?.allow_repeat).toBe(
			true
		);
		expect(
			tables.prototype_slot_exercise
				.filter((row) => row.slot_id === 'slot-pool')
				.map((row) => [row.ord, row.exercise_id])
		).toEqual([
			[1, 'ex-row-1'],
			[2, 'ex-neck-2']
		]);
	});

	it('хранит пары с упражнениями по порядку, недели ротации и словарные зону и вид мишеней', () => {
		expect(tables.prototype_pairing).toEqual([
			{ exercise_id: 'ex-neck-1', ord: 1, pairing_ord: 1, slot_id: 'slot-pool' }
		]);
		expect(tables.prototype_program).toEqual([{ program_id: PROGRAM_ID, rotation_weeks: 2 }]);
		expect(tables.prototype_target).toContainEqual({
			kind: 'system',
			target_id: '01a0889d-3848-7b73-adc5-6b00a88f5526',
			zone: 'cardio'
		});
	});
});
