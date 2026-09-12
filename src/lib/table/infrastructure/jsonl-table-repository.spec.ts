import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { jsonObjectOf } from '../../../test/json.ts';
import { sourceCatalog } from '../../../test/table-fixtures.ts';
import { tablesOf } from '../domain/convert.ts';
import { rowsOf } from '../domain/table-file.ts';
import { createJsonlTableRepository } from './jsonl-table-repository.ts';

const directory = mkdtempSync(path.join(tmpdir(), 'tables-'));
const repository = createJsonlTableRepository({ directory });
repository.writeAll(tablesOf(sourceCatalog()));

describe('writeAll', () => {
	it('пишет по файлу на таблицу, по строке на кортеж', () => {
		const file = readFileSync(path.join(directory, 'muscle_group.jsonl'), 'utf8');
		expect(file.trimEnd().split('\n')).toHaveLength(2);
	});

	it('держит столбцы в порядке схемы и кладёт null вместо пропуска', () => {
		const file = readFileSync(path.join(directory, 'target.jsonl'), 'utf8');
		const row = jsonObjectOf(String(file.split('\n', 1)[0]));
		expect(Object.keys(row)).toEqual([
			'id',
			'muscle_group_id',
			'target_group_id',
			'slug',
			'name',
			'latin',
			'kind'
		]);
	});
});

describe('readAll', () => {
	it('читает записанное обратно кортежами', () => {
		const set = repository.readAll();
		expect(set.files.map((file) => file.name)).toContain('exercise');
		expect(rowsOf(set, 'muscle_group')).toHaveLength(2);
	});

	it('оставляет неразобранную строку текстом и пропускает пустые', () => {
		writeFileSync(path.join(directory, 'equipment.jsonl'), '\n{не json}\n\n', 'utf8');
		const file = repository.readAll().files.find((item) => item.name === 'equipment');
		expect(file?.lines).toEqual([{ at: 2, parsed: '{не json}', text: '{не json}' }]);
	});
});
