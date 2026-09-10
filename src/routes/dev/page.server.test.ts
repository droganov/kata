import { describe, expect, it } from 'vitest';

import { load } from './+page.server.ts';

describe('load /dev на боевых данных', () => {
	const data = load();

	it('отдаёт программу, пять секций и пять банков', () => {
		expect(data.program.title).toBe('Программа: БАЗА + ПУЛ');
		expect(data.sections.map((section) => section.slug)).toEqual([
			'warmup_cardio',
			'warmup',
			'strength',
			'calisthenics',
			'stretch'
		]);
		expect(
			data.banks.map((bank) => bank.slug).toSorted((left, right) => left.localeCompare(right))
		).toEqual(['calisthenics', 'cardio', 'strength', 'stretch', 'warmup']);
	});

	it('у каждого упражнения есть промпт и имена целей', () => {
		const exercises = Object.values(data.exercises);
		expect(exercises.length).toBeGreaterThan(0);
		expect(exercises.every((exercise) => exercise.prompt !== undefined)).toBe(true);
		expect(exercises.every((exercise) => exercise.targets.length > 0)).toBe(true);
	});
});
