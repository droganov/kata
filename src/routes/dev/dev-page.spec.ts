import { describe, expect, it } from 'vitest';

import type { DevPageInputs, DevPageUseCases } from './dev-page.ts';

import { devPageDataOf, loadDevPage } from './dev-page.ts';

const INPUTS = {
	banks: [
		{
			slug: 'warmup',
			title: 'Разминка',
			zones: [
				{
					contours: [
						{
							exerciseIds: ['e1', 'ghost'],
							id: 'c1',
							pick: 1,
							slug: 'neck',
							title: 'шейный отдел'
						}
					],
					id: 'z1',
					slug: 'neck',
					title: 'Шея'
				}
			]
		}
	],
	equipment: [{ canonEn: 'body', id: 'q1', kind: 'body', name: 'Тело', slug: 'body' }],
	exercises: [
		{
			constraints: {
				axial: false,
				free_weight: false,
				lumbar_ext: false,
				lumbar_flex: false
			},
			dose: '2×10',
			equipment: [
				{ id: 'q1', role: 'main' },
				{ id: 'q-unknown', role: 'auxiliary' }
			],
			id: 'e1',
			mode: 'dynamic',
			name: 'Наклоны',
			note: 'медленно',
			procedure: {
				id: 'p1',
				steps: [
					{
						active: ['t1', 't-unknown'],
						id: 's1',
						oracles: [
							{
								counterModel: ['рывок'],
								id: 'o1',
								model: ['плавно'],
								predicate: 'темп'
							}
						],
						title: 'Наклон'
					}
				]
			},
			slug: 'neck_bend',
			targets: [{ id: 't1', role: 'primary' }]
		},
		{
			constraints: {
				axial: false,
				free_weight: false,
				lumbar_ext: false,
				lumbar_flex: false
			},
			dose: '30с',
			equipment: [],
			id: 'e2',
			mode: 'isometric',
			name: 'Планка',
			procedure: { id: 'p2', steps: [] },
			slug: 'plank',
			targets: []
		}
	],
	outline: {
		id: 'prog',
		sections: [
			{
				baseExerciseIds: ['e2'],
				groups: [
					{
						id: 'slot-1',
						slots: [
							{
								allowRepeat: true,
								contourTitle: 'шейный отдел',
								exerciseIds: ['e1', 'ghost'],
								id: 'slot-1',
								label: 'Шея',
								pick: 1,
								rule: 'без рывков'
							}
						],
						zone: { id: 'z1', title: 'Шея' }
					},
					{
						id: 'slot-2',
						slots: [
							{
								allowRepeat: false,
								exerciseIds: ['e2'],
								id: 'slot-2',
								label: 'Кор',
								pick: 1
							}
						]
					}
				],
				id: 'sec',
				mode: 'dynamic',
				slug: 'warmup',
				title: 'Разминка'
			}
		],
		title: 'Программа'
	},
	prompts: [{ exercise: 'e1', slug: 'neck_bend', text: 'PROMPT' }],
	targets: [{ id: 't1', kind: 'muscle', latin: 'l', name: 'Шея', slug: 'neck', zone: 'Шея' }]
} as unknown as DevPageInputs;

describe('devPageDataOf', () => {
	const data = devPageDataOf(INPUTS);

	it('разворачивает упражнения с именами средств и целей, промптом и заметкой', () => {
		expect(data.exercises.e1).toEqual({
			equipment: 'Тело — main · q-unknown — auxiliary',
			id: 'e1',
			name: 'Наклоны',
			note: 'медленно',
			prompt: 'PROMPT',
			steps: [
				{
					active: 'Шея · t-unknown',
					id: 's1',
					oracles: [
						{ counterModel: ['рывок'], id: 'o1', model: ['плавно'], predicate: 'темп' }
					],
					title: 'Наклон'
				}
			],
			targets: 'Шея — primary'
		});
		expect(data.exercises.e2).toEqual({
			equipment: '',
			id: 'e2',
			name: 'Планка',
			steps: [],
			targets: ''
		});
	});

	it('строит секции программы: база, группы по зонам, неизвестный номер остаётся строкой', () => {
		expect(data.program).toEqual({ id: 'prog', title: 'Программа' });
		expect(data.sections).toEqual([
			{
				base: [{ dose: '30с', id: 'e2', name: 'Планка' }],
				groups: [
					{
						id: 'slot-1',
						slots: [
							{
								allowRepeat: true,
								contourTitle: 'шейный отдел',
								exercises: [
									{ dose: '2×10', id: 'e1', name: 'Наклоны' },
									{ dose: '', id: 'ghost', name: 'ghost' }
								],
								id: 'slot-1',
								label: 'Шея',
								pick: 1,
								rule: 'без рывков'
							}
						],
						zone: { id: 'z1', title: 'Шея' }
					},
					{
						id: 'slot-2',
						slots: [
							{
								allowRepeat: false,
								exercises: [{ dose: '30с', id: 'e2', name: 'Планка' }],
								id: 'slot-2',
								label: 'Кор',
								pick: 1
							}
						]
					}
				],
				id: 'sec',
				mode: 'dynamic',
				slug: 'warmup',
				title: 'Разминка'
			}
		]);
	});

	it('строит банки: зоны, контуры с выбором, строки упражнений', () => {
		expect(data.banks).toEqual([
			{
				slug: 'warmup',
				title: 'Разминка',
				zones: [
					{
						contours: [
							{
								exercises: [
									{ dose: '2×10', id: 'e1', name: 'Наклоны' },
									{ dose: '', id: 'ghost', name: 'ghost' }
								],
								id: 'c1',
								pick: 1,
								title: 'шейный отдел'
							}
						],
						id: 'z1',
						title: 'Шея'
					}
				]
			}
		]);
	});
});

const useCasesOf = (programs: readonly string[]): DevPageUseCases =>
	({
		catalog: {
			findEquipment: () => INPUTS.equipment,
			findTargets: () => INPUTS.targets,
			listBanks: () => INPUTS.banks
		},
		exercise: { listExercises: () => INPUTS.exercises },
		program: {
			listUsers: () => [{ id: 'u1', name: 'Сергей', programs }],
			outlineProgram: () => INPUTS.outline
		},
		storyboard: { renderAllPrompts: () => INPUTS.prompts }
	}) as unknown as DevPageUseCases;

describe('loadDevPage', () => {
	it('берёт первую программу первого пользователя', () => {
		expect(loadDevPage(useCasesOf(['prog']))).toEqual(devPageDataOf(INPUTS));
	});

	it('без программы падает с понятной ошибкой', () => {
		expect(() => loadDevPage(useCasesOf([]))).toThrow('у первого пользователя нет программы');
	});
});
