import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';

import { createJsonBankRepository } from './json-bank-repository.ts';

const directory = mkdtempSync(path.join(tmpdir(), 'catalog-banks-'));
const bankOf = (slug: string): Record<string, unknown> => ({
	id: slug,
	rules: [],
	slug,
	title: slug,
	zones: []
});
writeFileSync(path.join(directory, 'warmup.json'), JSON.stringify(bankOf('warmup')), 'utf8');
writeFileSync(path.join(directory, 'cardio.json'), JSON.stringify(bankOf('cardio')), 'utf8');
writeFileSync(path.join(directory, 'notes.txt'), 'не банк', 'utf8');

describe('createJsonBankRepository', () => {
	it('читает банки по алфавиту и проверяет каждый по схеме', () => {
		const assertValid = vi.fn();
		const repository = createJsonBankRepository({ directory, validator: { assertValid } });
		expect(repository.readAll().map((bank) => bank.slug)).toEqual(['cardio', 'warmup']);
		expect(assertValid).toHaveBeenCalledTimes(2);
		expect(assertValid.mock.calls[0]?.[0]).toBe('bank.schema.json');
	});

	it('поднимает ошибку схемы наружу', () => {
		const assertValid = vi.fn(() => {
			throw new Error('схема нарушена');
		});
		const repository = createJsonBankRepository({ directory, validator: { assertValid } });
		expect(() => repository.readAll()).toThrow('схема нарушена');
	});
});
