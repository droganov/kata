import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';

import { createExerciseJsonGateway } from './exercise-json-gateway.ts';

const directory = mkdtempSync(path.join(tmpdir(), 'program-banks-'));

const exerciseOf = (slug: string): Record<string, unknown> => ({
	constraints: { axial: false, free_weight: false, lumbar_ext: false, lumbar_flex: false },
	dose: '3×12–15',
	equipment: [],
	id: slug,
	mode: 'loaded',
	name: slug,
	procedure: { id: 'proc', steps: [] },
	slug,
	source: 'source',
	targets: []
});

const bankOf = (slug: string, slugs: readonly string[]): Record<string, unknown> => ({
	id: slug,
	slug,
	title: slug,
	zones: [
		{
			contours: [
				{
					exercises: slugs.map((one) => exerciseOf(one)),
					id: 'contour',
					slug: 'main',
					title: 'Основной'
				}
			],
			id: 'zone',
			slug: 'zone',
			title: 'Зона'
		}
	]
});

writeFileSync(
	path.join(directory, 'strength.json'),
	JSON.stringify(bankOf('strength', ['a'])),
	'utf8'
);
writeFileSync(path.join(directory, 'cardio.json'), JSON.stringify(bankOf('cardio', ['b'])), 'utf8');
writeFileSync(path.join(directory, 'notes.txt'), 'не банк', 'utf8');

describe('createExerciseJsonGateway', () => {
	it('отдаёт упражнения всех банков по алфавиту через соседа', () => {
		const assertValid = vi.fn();
		const gateway = createExerciseJsonGateway({ directory, validator: { assertValid } });
		expect(gateway.readExercises().map((exercise) => exercise.slug)).toEqual(['b', 'a']);
		expect(assertValid).toHaveBeenCalledTimes(2);
		expect(assertValid.mock.calls[0]?.[0]).toBe('exercise.schema.json');
		expect(assertValid.mock.calls[0]?.[2]).toBe('cardio/main/0');
	});

	it('поднимает ошибку схемы наружу', () => {
		const assertValid = vi.fn(() => {
			throw new Error('схема нарушена');
		});
		const gateway = createExerciseJsonGateway({ directory, validator: { assertValid } });
		expect(() => gateway.readExercises()).toThrow('схема нарушена');
	});
});
