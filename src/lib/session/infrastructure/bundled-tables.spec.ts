import { describe, expect, it } from 'vitest';

import { BUNDLED_TABLES, tableRowsOf } from './bundled-tables.ts';

describe('tableRowsOf', () => {
	it('называет таблицу по файлу и разбирает кортежи, пропуская пустые строки', () => {
		const tables = tableRowsOf({ '/data/block.jsonl': '{"id":"b1"}\n\n{"id":"b2"}\n' });
		expect(tables.get('block')).toEqual([{ id: 'b1' }, { id: 'b2' }]);
	});

	it.each(['1', 'null', '[1]'])('бросает на строке, которая не объект: %s', (line) => {
		expect(() => tableRowsOf({ '/data/block.jsonl': line })).toThrow(line);
	});
});

describe('BUNDLED_TABLES', () => {
	it('держит в памяти таблицы Программы, каталога и процедур', () => {
		expect(
			BUNDLED_TABLES.keys()
				.toArray()
				.toSorted((first, second) => first.localeCompare(second))
		).toEqual([
			'block',
			'block_draw',
			'block_pin_group',
			'block_pin_target',
			'equipment',
			'exercise',
			'exercise_equipment',
			'exercise_target',
			'muscle_group',
			'oracle',
			'oracle_line',
			'program',
			'step',
			'step_target',
			'target'
		]);
		expect(BUNDLED_TABLES.get('exercise')).toHaveLength(420);
	});
});
