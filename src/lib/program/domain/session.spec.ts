import { describe, expect, it } from 'vitest';

import type { PlanExercise } from './plan-exercise.ts';
import type { Session } from './session.ts';

import { sectionExercises, sessionSectionsWithMode } from './session.ts';

const exerciseOf = (id: string): PlanExercise => ({
	constraints: { axial: false, free_weight: false, lumbar_ext: false, lumbar_flex: false },
	dose: '3×12',
	hasProcedure: true,
	id,
	mode: 'loaded',
	name: id,
	slug: id,
	targets: []
});

const SESSION: Session = {
	index: 1,
	minutes: 60,
	program: 'program',
	sections: [
		{
			mode: 'loaded',
			section: 'strength',
			slots: [
				{ exercises: [exerciseOf('a')], kind: 'base', label: 'База', slot: 'base' },
				{ exercises: [exerciseOf('b')], kind: 'pool', label: 'Пул', slot: 'pool' }
			],
			slug: 'strength',
			title: 'Силовой'
		},
		{
			mode: 'static_stretch',
			section: 'stretch',
			slots: [{ exercises: [exerciseOf('c')], kind: 'base', label: 'База', slot: 'st' }],
			slug: 'stretch',
			title: 'Растяжка'
		}
	],
	slug: 'w1d1',
	title: 'Занятие 1'
};

describe('session', () => {
	it('собирает упражнения раздела по всем слотам', () => {
		expect(sectionExercises(SESSION.sections[0]!).map((item) => item.id)).toEqual(['a', 'b']);
	});

	it('отбирает разделы занятия по режиму', () => {
		expect(sessionSectionsWithMode(SESSION, 'static_stretch').map((one) => one.slug)).toEqual([
			'stretch'
		]);
		expect(sessionSectionsWithMode(SESSION, 'cardio')).toEqual([]);
	});
});
