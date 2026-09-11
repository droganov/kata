import { describe, expect, it } from 'vitest';

import type { ExerciseView } from '../../exercise/application/exercise-views.ts';
import type { StoryboardGateways } from './storyboard-gateways.ts';

import { renderAllPrompts } from './render-all-prompts.ts';

const exerciseOf = (id: string, slug: string, name: string): ExerciseView =>
	({
		constraints: { axial: false, free_weight: false, lumbar_ext: false, lumbar_flex: false },
		dose: '3×30с',
		equipment: [{ id: 'eq-mat', role: 'main' }],
		id,
		mode: 'isometric',
		name,
		procedure: {
			id: 'pr-1',
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
		slug,
		targets: [{ id: 'tg-abs', role: 'primary' }]
	}) as unknown as ExerciseView;

const EXERCISES: readonly ExerciseView[] = [
	exerciseOf('ex-plank', 'plank_forearms', 'Планка'),
	exerciseOf('ex-side', 'side_plank', 'Боковая планка')
];

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
		find: (id) => EXERCISES.find((exercise) => exercise.id === id),
		readAll: () => EXERCISES
	}
};

describe('renderAllPrompts', () => {
	it('строит промпт на каждое упражнение', () => {
		const views = renderAllPrompts(GATEWAYS);
		expect(views.map((view) => view.slug)).toEqual(['plank_forearms', 'side_plank']);
		expect(views[1]?.text).toContain('STORYBOARD — Боковая планка — dose 3×30с');
	});

	it('даёт одинаковый текст при двух вызовах', () => {
		expect(renderAllPrompts(GATEWAYS).map((view) => view.text)).toEqual(
			renderAllPrompts(GATEWAYS).map((view) => view.text)
		);
	});
});
