import { describe, expect, it } from 'vitest';

import type { ExerciseView } from '../../exercise/application/exercise-views.ts';
import type { StoryboardGateways } from './storyboard-gateways.ts';

import { uuidOfLabel } from '../../../test/uuid.ts';
import { renderPrompt } from './render-prompt.ts';

const PLANK: ExerciseView = {
	constraints: { axial: false, free_weight: false, lumbar_ext: false, lumbar_flex: false },
	dose: '3×30с',
	equipment: [{ id: uuidOfLabel('eq-mat'), role: 'main' }],
	id: 'ex-plank',
	mode: 'isometric',
	name: 'Планка на предплечьях',
	procedure: {
		id: uuidOfLabel('pr-plank'),
		steps: [
			{
				active: [uuidOfLabel('tg-abs')],
				id: uuidOfLabel('st-1'),
				oracles: [
					{
						counterModel: ['Провисание таза'],
						id: uuidOfLabel('or-1'),
						model: ['Ширина хвата по плечам'],
						predicate: 'Ладони под плечами'
					}
				],
				title: 'Принять упор лёжа'
			}
		]
	},
	slug: 'plank_forearms',
	targets: [{ id: uuidOfLabel('tg-abs'), role: 'primary' }]
};

const GATEWAYS: StoryboardGateways = {
	catalog: {
		readEquipment: () => [
			{
				canonEn: 'Exercise mat',
				id: uuidOfLabel('eq-mat'),
				kind: 'tool',
				name: 'Коврик',
				slug: 'mat'
			}
		],
		readTargets: () => [
			{
				id: uuidOfLabel('tg-abs'),
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
