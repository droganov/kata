import { describe, expect, it } from 'vitest';

import { sourceCatalog, tableSetOf } from '../../../../test/table-fixtures.ts';
import { tablesOf } from '../convert.ts';
import { tableNames } from '../table.ts';
import { foreignKeysResolve, uniqueKeysHold } from './integrity-rules.ts';

const tables = tablesOf(sourceCatalog());
const complete = tableSetOf(Object.fromEntries(tableNames().map((name) => [name, tables[name]])));

describe('I1 внешние ключи', () => {
	it('молчит на связном наборе таблиц', () => {
		expect(foreignKeysResolve(complete)).toEqual([]);
	});

	it('находит висячую ссылку', () => {
		const findings = foreignKeysResolve(
			tableSetOf({
				muscle_group: tables.muscle_group,
				target: [{ ...tables.target[0], muscle_group_id: 'нет такой' }]
			})
		);
		expect(findings).toHaveLength(1);
		expect(findings[0]?.message).toContain('нет такой');
	});
});

describe('I2 уникальность', () => {
	it('молчит, когда ключи уникальны', () => {
		expect(uniqueKeysHold(complete)).toEqual([]);
	});

	it('находит повтор slug мишени', () => {
		const twin = tables.target[0];
		const findings = uniqueKeysHold(
			tableSetOf({ target: [twin, { ...twin, id: 'другая строка' }] })
		);
		expect(findings.map((finding) => finding.subject)).toEqual(['target:2', 'target:2']);
	});
});
