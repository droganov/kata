import { describe, expect, it } from 'vitest';

import { createCatalog } from './catalog.ts';

const catalog = createCatalog();

describe('createCatalog на боевых данных', () => {
	it('читает пять банков со структурой зон и контуров', () => {
		const banks = catalog.listBanks();
		const slugs = banks
			.map((bank) => bank.slug)
			.toSorted((first, second) => first.localeCompare(second));
		expect(slugs).toEqual(['calisthenics', 'cardio', 'strength', 'stretch', 'warmup']);
		expect(banks.every((bank) => bank.zones.length > 0)).toBe(true);
	});

	it('читает средства и цели', () => {
		const equipment = catalog.findEquipment();
		const body = equipment.find((item) => item.slug === 'body');
		expect(body?.canonEn).toBe('Bodyweight');
		expect(catalog.findEquipment(body === undefined ? [] : [body.id])).toHaveLength(1);
		const targets = catalog.findTargets();
		expect(targets.length).toBeGreaterThan(0);
		expect(catalog.findTargets([])).toHaveLength(0);
	});

	it('прогоняет все правила и считает провалы', () => {
		const report = catalog.validateCatalog();
		expect(report.banks).toHaveLength(5);
		expect(report.failureCount).toBe(
			report.banks.reduce((total, bank) => total + bank.findings.length, 0)
		);
	});
});
