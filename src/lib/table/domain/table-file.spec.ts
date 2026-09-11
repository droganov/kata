import { describe, expect, it } from 'vitest';

import { fileOf, isPlainObject, isScalar, rowsOf, textAt } from './table-file.ts';
import { TABLE_NAME } from './table.ts';

const set = {
	files: [
		{
			lines: [
				{ at: 1, parsed: { id: 'a' }, text: '{"id":"a"}' },
				{ at: 2, parsed: 'сломанная строка', text: 'сломанная строка' },
				{ at: 3, parsed: [1], text: '[1]' }
			],
			name: TABLE_NAME.target
		}
	]
};

describe('fileOf', () => {
	it('находит файл таблицы и молчит об отсутствующем', () => {
		expect(fileOf(set, TABLE_NAME.target)?.lines).toHaveLength(3);
		expect(fileOf(set, TABLE_NAME.exercise)).toBeUndefined();
	});
});

describe('isPlainObject', () => {
	it('объект да, массив и null нет', () => {
		expect(isPlainObject({})).toBe(true);
		expect(isPlainObject([])).toBe(false);
		expect(isPlainObject(null)).toBe(false);
		expect(isPlainObject('a')).toBe(false);
	});
});

describe('isScalar', () => {
	it('строка, число, булево и null да, остальное нет', () => {
		expect([null, 'a', 1, false].every((value) => isScalar(value))).toBe(true);
		expect([{}, [], undefined].some((value) => isScalar(value))).toBe(false);
	});
});

describe('rowsOf', () => {
	it('берёт только кортежи-объекты', () => {
		expect(rowsOf(set, TABLE_NAME.target)).toEqual([{ id: 'a' }]);
		expect(rowsOf(set, TABLE_NAME.exercise)).toEqual([]);
	});
});

describe('textAt', () => {
	it('приводит значение столбца к строке', () => {
		expect(textAt({ id: 1 }, 'id')).toBe('1');
		expect(textAt({}, 'id')).toBe('undefined');
	});
});
