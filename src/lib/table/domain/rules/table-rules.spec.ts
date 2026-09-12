import { describe, expect, it } from 'vitest';

import { sourceCatalog, tableSetOf } from '../../../../test/table-fixtures.ts';
import {
	CARRY_RULES,
	CATALOG_RULES,
	FORMAT_RULES,
	INTEGRITY_RULES,
	tableRules
} from './table-rules.ts';

const FORMAT_RULE_COUNT = 5;

describe('перечень правил', () => {
	it('держит пять правил формата и целостность отдельно', () => {
		expect(FORMAT_RULES).toHaveLength(FORMAT_RULE_COUNT);
		expect(INTEGRITY_RULES.length).toBeGreaterThan(0);
		expect(tableRules()).toHaveLength(
			FORMAT_RULES.length + INTEGRITY_RULES.length + CATALOG_RULES.length + CARRY_RULES.length
		);
	});

	it('каждое правило принимает набор таблиц и источник', () => {
		const set = tableSetOf({});
		const catalog = sourceCatalog();
		for (const rule of tableRules()) expect(rule(set, catalog)).toBeInstanceOf(Array);
	});
});
