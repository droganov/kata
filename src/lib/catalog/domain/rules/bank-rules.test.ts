import { describe, expect, it } from 'vitest';

import type { Bank } from '../bank.ts';
import type { Catalog } from '../catalog.ts';

import { uuidOf } from '../../../shared/uuid.ts';
import { BANK_SLUG } from '../bank.ts';
import { rulesForBank } from './bank-rules.ts';

const ID = uuidOf('01a0889d-3852-7051-a039-c9778729a468');
const emptyCatalog: Catalog = { banks: [], equipment: [], targets: [] };

describe('rulesForBank', () => {
	it('даёт правила каждому банку', () => {
		for (const slug of Object.values(BANK_SLUG))
			expect(rulesForBank(slug).length).toBeGreaterThan(0);
	});

	it('кардио получает только связи и инварианты', () => {
		expect(rulesForBank(BANK_SLUG.cardio).length).toBeLessThan(
			rulesForBank(BANK_SLUG.strength).length
		);
	});

	it('правила выполняются на пустом банке без исключений', () => {
		const bank = {
			id: ID,
			rules: [],
			slug: BANK_SLUG.stretch,
			title: 'Растяжка',
			zones: []
		} as Bank;
		const findings = rulesForBank(bank.slug).flatMap((rule) => rule(bank, emptyCatalog));
		expect(findings.every((finding) => finding.rule.length > 0)).toBe(true);
	});
});
