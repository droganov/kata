import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';

import { createJsonExerciseRepository } from './json-exercise-repository.ts';

const directory = mkdtempSync(path.join(tmpdir(), 'exercise-banks-'));

const bankOf = (slug: string, exerciseSlug: string): Record<string, unknown> => ({
	slug,
	zones: [
		{
			contours: [
				{
					exercises: [{ id: `id-${exerciseSlug}`, slug: exerciseSlug }],
					slug: 'hip',
					title: 'бёдра'
				}
			]
		}
	]
});

writeFileSync(
	path.join(directory, 'stretch.json'),
	JSON.stringify(bankOf('stretch', 'frog')),
	'utf8'
);
writeFileSync(path.join(directory, 'cardio.json'), JSON.stringify(bankOf('cardio', 'row')), 'utf8');
writeFileSync(path.join(directory, 'notes.txt'), 'не банк', 'utf8');

describe('createJsonExerciseRepository', () => {
	it('читает упражнения всех банков по алфавиту с контуром и банком', () => {
		const assertValid = vi.fn();
		const repository = createJsonExerciseRepository({ directory, validator: { assertValid } });
		const records = repository.readAll();
		expect(records.map((record) => [record.bank, record.exercise.slug])).toEqual([
			['cardio', 'row'],
			['stretch', 'frog']
		]);
		expect(records[0]?.contourSlug).toBe('hip');
		expect(records[0]?.contourTitle).toBe('бёдра');
		expect(assertValid).toHaveBeenCalledTimes(4);
		expect(assertValid.mock.calls[0]?.[0]).toBe('bank.schema.json');
		expect(assertValid.mock.calls[1]?.[0]).toBe('exercise.schema.json');
		expect(assertValid.mock.calls[1]?.[2]).toBe('cardio/hip/0');
	});

	it('поднимает ошибку схемы наружу', () => {
		const assertValid = vi.fn(() => {
			throw new Error('схема нарушена');
		});
		const repository = createJsonExerciseRepository({ directory, validator: { assertValid } });
		expect(() => repository.readAll()).toThrow('схема нарушена');
	});
});
