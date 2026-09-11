import { describe, expect, it } from 'vitest';

import { sourceCatalog, tableSetOf } from '../../../../test/table-fixtures.ts';
import { tablesOf } from '../convert.ts';
import { tableNames } from '../table.ts';
import {
	fileNamesMatchTables,
	keysMatchColumns,
	linesAreTuples,
	primaryKeysIdentifyRows,
	valuesAreScalar
} from './format-rules.ts';

const tables = tablesOf(sourceCatalog());
const complete = tableSetOf(Object.fromEntries(tableNames().map((name) => [name, tables[name]])));

describe('F1 один файл на таблицу', () => {
	it('молчит, когда файлы совпадают с перечнем таблиц', () => {
		expect(fileNamesMatchTables(complete)).toEqual([]);
	});

	it('находит недостающие и лишние файлы', () => {
		const findings = fileNamesMatchTables(tableSetOf({ verdict: [] }));
		expect(findings).toHaveLength(2);
		expect(findings[0]?.message).toContain('muscle_group');
		expect(findings[1]?.message).toContain('verdict');
	});
});

describe('F2 одна строка один кортеж', () => {
	it('молчит на объектах в одну строку', () => {
		expect(linesAreTuples(complete)).toEqual([]);
	});

	it('находит строку не объект и перевод строки внутри кортежа', () => {
		const set = {
			files: [
				{
					lines: [
						{ at: 1, parsed: 'мусор', text: 'мусор' },
						{ at: 2, parsed: { id: 'a' }, text: '{"id":\n"a"}' }
					],
					name: 'target'
				}
			]
		};
		const findings = linesAreTuples(set);
		expect(findings.map((finding) => finding.subject)).toEqual(['target:1', 'target:2']);
	});
});

describe('F3 ключи совпадают со столбцами', () => {
	it('молчит на полных кортежах', () => {
		expect(keysMatchColumns(complete)).toEqual([]);
	});

	it('находит лишние и недостающие ключи', () => {
		const findings = keysMatchColumns(
			tableSetOf({ muscle_group: [{ id: 'a', zone: 'neck' }] })
		);
		expect(findings).toHaveLength(1);
		expect(findings[0]?.message).toContain('zone');
		expect(findings[0]?.message).toContain('slug');
	});
});

describe('F4 значения только скалярные', () => {
	it('молчит на скалярах', () => {
		expect(valuesAreScalar(complete)).toEqual([]);
	});

	it('находит массив и вложенный объект', () => {
		const findings = valuesAreScalar(
			tableSetOf({ equipment: [{ exercises: ['a'], id: 'a', kind: { a: 1 } }] })
		);
		expect(findings.map((finding) => finding.message)).toEqual([
			'exercises: массив или вложенный объект',
			'kind: массив или вложенный объект'
		]);
	});
});

describe('F5 порядок строк не значим', () => {
	it('молчит, когда первичный ключ на месте и уникален', () => {
		expect(primaryKeysIdentifyRows(complete)).toEqual([]);
	});

	it('молчит об отсутствующем файле', () => {
		expect(primaryKeysIdentifyRows(tableSetOf({}))).toEqual([]);
	});

	it('находит пустой и повторённый первичный ключ', () => {
		const findings = primaryKeysIdentifyRows(
			tableSetOf({
				exercise_target: [
					{ exercise_id: 'a', target_id: 't' },
					{ exercise_id: 'a', target_id: 't' },
					{ exercise_id: null, target_id: null }
				]
			})
		);
		expect(findings.map((finding) => finding.subject)).toEqual([
			'exercise_target:2',
			'exercise_target:3'
		]);
	});
});
