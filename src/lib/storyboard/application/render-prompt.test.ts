import { describe, expect, it } from 'vitest';

import type { ExerciseView } from '../../exercise/application/exercise-views.ts';
import type { StoryboardGateways } from './storyboard-gateways.ts';

import { renderPrompt } from './render-prompt.ts';

const PLANK = {
	constraints: { axial: false, free_weight: false, lumbar_ext: false, lumbar_flex: false },
	dose: '3×30с',
	equipment: [{ id: 'eq-mat', role: 'main' }],
	id: 'ex-plank',
	mode: 'isometric',
	name: 'Планка на предплечьях',
	procedure: {
		id: 'pr-plank',
		steps: [
			{
				active: ['tg-abs'],
				id: 'st-1',
				oracles: [
					{
						counterModel: ['Провисание таза'],
						id: 'or-1',
						model: ['Ширина хвата по плечам'],
						predicate: 'Ладони под плечами'
					}
				],
				title: 'Принять упор лёжа'
			}
		]
	},
	slug: 'plank_forearms',
	targets: [{ id: 'tg-abs', role: 'primary' }]
} as unknown as ExerciseView;

const GATEWAYS: StoryboardGateways = {
	catalog: {
		readEquipment: () => [
			{ canonEn: 'Exercise mat', id: 'eq-mat', kind: 'tool', name: 'Коврик', slug: 'mat' }
		],
		readTargets: () => [
			{
				id: 'tg-abs',
				kind: 'muscle',
				latin: 'Rectus abdominis',
				name: 'Прямая мышца живота',
				slug: 'rectus-abdominis',
				zone: 'core'
			}
		]
	},
	exercises: {
		find: (id) => (id === PLANK.id ? PLANK : undefined),
		readAll: () => [PLANK]
	}
};

describe('renderPrompt', () => {
	it('отдаёт промпт упражнения со слагом', () => {
		const view = renderPrompt(GATEWAYS, 'ex-plank');
		expect(view?.slug).toBe('plank_forearms');
		expect(view?.exercise).toBe('ex-plank');
		expect(view?.text).toContain('STORYBOARD — Планка на предплечьях — dose 3×30с');
		expect(view?.text).toContain('  ACTIVE (solid red): Rectus abdominis.');
	});

	it('отдаёт «ничего» для неизвестного упражнения', () => {
		expect(renderPrompt(GATEWAYS, 'ex-none')).toBeUndefined();
	});
});
