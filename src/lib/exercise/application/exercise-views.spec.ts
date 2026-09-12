import { describe, expect, it } from 'vitest';

import type { Exercise } from '../domain/exercise.ts';

import { uuidOfLabel } from '../../../test/uuid.ts';
import { exerciseViewOf } from './exercise-views.ts';

const base = {
	constraints: { axial: false, free_weight: false, lumbar_ext: false, lumbar_flex: false },
	dose: '3×10',
	equipment: [{ id: uuidOfLabel('body'), role: 'main' }],
	id: uuidOfLabel('e1'),
	mode: 'dynamic',
	name: 'Выпад',
	procedure: { id: uuidOfLabel('p1'), steps: [] },
	slug: 'lunge',
	source: uuidOfLabel('src'),
	targets: [{ id: uuidOfLabel('t1'), role: 'primary' }]
} satisfies Exercise;

describe('exerciseViewOf', () => {
	it('переносит обязательные поля и опускает пустые', () => {
		const view = exerciseViewOf(base);
		expect(view).toEqual({
			constraints: base.constraints,
			dose: '3×10',
			equipment: base.equipment,
			id: base.id,
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
		});
		expect([view.goal, view.hipPlane, view.note, view.plane, view.seconds]).toEqual([
			'glutes',
			'extension',
			'заметка',
			'anterior',
			30
		]);
	});
});
