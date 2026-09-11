import { describe, expect, it } from 'vitest';

import type { PlanExercise } from './plan-exercise.ts';

import { groupWeightsOf, hasPrimaryGroup, planExercisesOf } from './plan-exercise.ts';

const exerciseOf = (id: string, targets: PlanExercise['targets']): PlanExercise => ({
	constraints: { axial: false, free_weight: false, lumbar_ext: false, lumbar_flex: false },
	dose: '3×12',
	hasProcedure: true,
	id,
	mode: 'loaded',
	name: id,
	slug: id,
	targets
});

describe('plan-exercise', () => {
	it('берёт на группу самую сильную роль цели', () => {
		const exercise = exerciseOf('press', [
			{ group: 'chest', role: 'secondary' },
			{ group: 'chest', role: 'primary' },
			{ group: 'back', role: 'stabilizer' },
			{ group: 'delts', role: 'secondary' }
		]);
		expect([...groupWeightsOf(exercise)]).toEqual([
			['chest', 1],
			['back', 0],
			['delts', 0.5]
		]);
	});

	it('видит прямую цель по группе', () => {
		const exercise = exerciseOf('bridge', [
			{ group: 'glutes', role: 'primary' },
			{ group: 'hamstrings', role: 'secondary' }
		]);
		expect(hasPrimaryGroup(exercise, 'glutes')).toBe(true);
		expect(hasPrimaryGroup(exercise, 'hamstrings')).toBe(false);
	});

	it('пропускает неизвестные ссылки при разворачивании списка', () => {
		const known = new Map([['a', exerciseOf('a', [])]]);
		expect(planExercisesOf(['a', 'b'], known).map((item) => item.id)).toEqual(['a']);
	});
});
