import { describe, expect, it, vi } from 'vitest';

import type { VerdictRepository } from '../application/verdict-repository.ts';
import type { JsonVerdictSource } from '../infrastructure/json-verdict-repository.ts';

import { createExercise } from './exercise.ts';

interface VerdictModule {
	createJsonVerdictRepository: (source: JsonVerdictSource) => VerdictRepository;
}

vi.mock('../infrastructure/json-verdict-repository.ts', async (importOriginal) => {
	const original: VerdictModule = await importOriginal();
	return {
		createJsonVerdictRepository: (source: JsonVerdictSource): VerdictRepository => ({
			readAll: original.createJsonVerdictRepository(source).readAll,
			save: vi.fn()
		})
	} satisfies VerdictModule;
});

describe('createExercise на боевых данных', () => {
	it('собирает use cases: критик чист, очередь на суд пуста, упражнения читаются', () => {
		const exercise = createExercise();
		const report = exercise.validateExercises();
		expect(report.findings).toEqual([]);
		expect(report.recordCount).toBeGreaterThan(0);
		expect(exercise.judgeQueue()).toEqual([]);
		const views = exercise.listExercises();
		expect(views).toHaveLength(report.recordCount);
		const first = views[0]!;
		expect(exercise.findExercise(first.id)?.slug).toBe(first.slug);
	});

	it('слияние пустого набора вердиктов ничего не меняет', () => {
		const merge = createExercise().applyVerdicts([]);
		expect(merge.added).toBe(0);
		expect(merge.total).toBeGreaterThan(0);
	});
});
