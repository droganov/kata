import { describe, expect, it } from 'vitest';

import { keyOf, schemaOf, TABLE_NAME, TABLE_SCHEMAS, tableNames } from './table.ts';

describe('перечень таблиц', () => {
	it('называет каждую таблицу один раз', () => {
		expect(tableNames()).toEqual([...new Set(tableNames())]);
		expect(tableNames()).toHaveLength(TABLE_SCHEMAS.length);
	});

	it('первичный ключ и внешние ключи лежат среди столбцов', () => {
		for (const schema of TABLE_SCHEMAS) {
			for (const column of schema.primaryKey) expect(schema.columns).toContain(column);
			for (const key of schema.foreignKeys) expect(schema.columns).toContain(key.column);
			for (const columns of schema.unique)
				for (const column of columns) expect(schema.columns).toContain(column);
		}
	});

	it('внешние ключи ведут в объявленные таблицы и их столбцы', () => {
		for (const schema of TABLE_SCHEMAS)
			for (const key of schema.foreignKeys)
				expect(schemaOf(key.table).columns).toContain(key.references);
	});
});

describe('schemaOf', () => {
	it('находит схему по имени', () => {
		expect(schemaOf(TABLE_NAME.target).name).toBe(TABLE_NAME.target);
	});

	it('бросает на неизвестном имени', () => {
		expect(() => schemaOf('session' as never)).toThrow('session');
	});
});

describe('keyOf', () => {
	it('склеивает значения столбцов в один ключ', () => {
		const row = { a: '1', b: 2, c: null };
		expect(keyOf(row, ['a', 'b'])).not.toBe(keyOf(row, ['a', 'c']));
		expect(keyOf(row, ['a'])).toBe(keyOf({ a: '1' }, ['a']));
	});
});
