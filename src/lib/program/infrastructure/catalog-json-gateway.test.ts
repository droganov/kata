import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';

import type { CatalogJsonSource } from './catalog-json-gateway.ts';

import { createCatalogJsonGateway } from './catalog-json-gateway.ts';

const directory = mkdtempSync(path.join(tmpdir(), 'program-catalog-'));
const banksDirectory = path.join(directory, 'banks');
const targetsFile = path.join(directory, 'targets.json');

const bankOf = (slug: string): Record<string, unknown> => ({
	id: slug,
	rules: [],
	slug,
	title: slug,
	zones: [
		{
			contours: [{ exercises: [], id: 'contour', pick: 1, slug: 'hip', title: 'Бедро' }],
			id: 'zone',
			slug: 'hips',
			title: 'Бёдра'
		}
	]
});

mkdirSync(banksDirectory);
writeFileSync(path.join(banksDirectory, 'warmup.json'), JSON.stringify(bankOf('warmup')), 'utf8');
writeFileSync(path.join(banksDirectory, 'notes.txt'), 'не банк', 'utf8');
writeFileSync(
	targetsFile,
	JSON.stringify([
		{
			group: 'glutes',
			id: 'target-1',
			kind: 'muscle',
			latin: 'gluteus maximus',
			name: 'Большая ягодичная',
			slug: 'gluteus_maximus',
			zone: 'Ягодичные'
		}
	]),
	'utf8'
);

const sourceOf = (assertValid: () => void): CatalogJsonSource => ({
	banksDirectory,
	targetsFile,
	validator: { assertValid }
});

describe('createCatalogJsonGateway', () => {
	it('отдаёт банки и цели через соседа', () => {
		const assertValid = vi.fn();
		const gateway = createCatalogJsonGateway(sourceOf(assertValid));
		expect(gateway.readBanks().map((bank) => bank.slug)).toEqual(['warmup']);
		expect(gateway.readBanks()[0]?.zones[0]?.contours[0]?.slug).toBe('hip');
		expect(gateway.readTargets().map((target) => target.group)).toEqual(['glutes']);
		const schemaIds = assertValid.mock.calls.map((call: readonly string[]) => call[0]);
		expect(schemaIds).toEqual(['bank.schema.json', 'bank.schema.json', 'target.schema.json']);
	});

	it('поднимает ошибку схемы наружу', () => {
		const gateway = createCatalogJsonGateway(
			sourceOf(() => {
				throw new Error('схема нарушена');
			})
		);
		expect(() => gateway.readBanks()).toThrow('схема нарушена');
		expect(() => gateway.readTargets()).toThrow('схема нарушена');
	});
});
