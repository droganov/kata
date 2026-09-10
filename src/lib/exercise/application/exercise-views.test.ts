import { describe, expect, it } from 'vitest';

import type { Exercise } from '../domain/exercise.ts';

import { exerciseViewOf } from './exercise-views.ts';

const base = {
	constraints: { axial: false, free_weight: false, lumbar_ext: false, lumbar_flex: false },
	dose: '3×10',
	equipment: [{ id: 'body', role: 'main' }],
	id: 'e1',
	mode: 'dynamic',
	name: 'Выпад',
	procedure: { id: 'p1', steps: [] },
	slug: 'lunge',
	source: 'src',
	targets: [{ id: 't1', role: 'primary' }]
};

describe('exerciseViewOf', () => {
	it('переносит обязательные поля и опускает пустые', () => {
		const view = exerciseViewOf(base as unknown as Exercise);
		expect(view).toEqual({
			constraints: base.constraints,
			dose: '3×10',
			equipment: base.equipment,
			id: 'e1',
			mode: 'dynamic',
			name: 'Выпад',
			procedure: base.procedure,
			slug: 'lunge',
			targets: base.targets
		});
	});

	it('переносит необязательные поля и переименовывает плоскость таза', () => {
		const view = exerciseViewOf({
			...base,
			goal: 'glutes',
			hip_plane: 'extension',
			note: 'заметка',
			plane: 'anterior',
			seconds: 30
		} as unknown as Exercise);
		expect([view.goal, view.hipPlane, view.note, view.plane, view.seconds]).toEqual([
			'glutes',
			'extension',
			'заметка',
			'anterior',
			30
		]);
	});
});
