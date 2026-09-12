import { describe, expect, it } from 'vitest';

import type { Uuid } from '../../../shared/uuid.ts';
import type { Exercise } from '../exercise.ts';
import type { Issue } from '../finding.ts';
import type { ExerciseCheck } from './exercise-check.ts';

import { uuidOf } from '../../../shared/uuid.ts';
import { counterLineKey } from '../verdict.ts';
import { exerciseIssues } from './exercise-rules.ts';

const TARGET_ILIOPSOAS = uuidOf('01a0889d-0000-7000-8000-000000000001');
const TARGET_RECTUS = uuidOf('01a0889d-0000-7000-8000-000000000002');
const TARGET_UNKNOWN = uuidOf('01a0889d-0000-7000-8000-0000000000ff');
const BODY_EQUIPMENT = uuidOf('01a0889d-0000-7000-8000-000000000010');
const SOURCE_ID = uuidOf('01a0889d-0000-7000-8000-000000000020');

const id = (index: number): Uuid =>
	uuidOf(`01a0889d-0000-7000-8000-0000000001${index.toString(16).padStart(2, '0')}`);

const GOOD = {
	constraints: { axial: false, free_weight: false, lumbar_ext: false, lumbar_flex: false },
	dose: '2×40с/сторона',
	equipment: [{ id: BODY_EQUIPMENT, role: 'main' }],
	id: id(0),
	mode: 'static_stretch',
	name: 'Выпад с опорой на колено',
	procedure: {
		id: id(1),
		steps: [
			{
				active: [],
				id: id(2),
				oracles: [
					{
						counterModel: [
							'заднее колено съезжает по полу назад',
							'вес корпуса на руках'
						],
						id: id(3),
						model: [
							'заднее колено на полу',
							'заднее бедро вертикально',
							'корпус вертикален',
							'поясница нейтральна',
							'взгляд вперёд',
							'ладони лежат на переднем бедре'
						],
						predicate: 'Заднее колено под тазом'
					},
					{
						counterModel: [
							'передняя стопа на одной линии с задним коленом',
							'переднее колено смещено внутрь'
						],
						id: id(4),
						model: [
							'передняя стопа на полу целиком',
							'переднее колено над пяткой',
							'стопы на ширине таза'
						],
						predicate: 'Передняя голень вертикальна'
					}
				],
				title: 'Принять исходное положение'
			},
			{
				active: [TARGET_ILIOPSOAS],
				id: id(5),
				oracles: [
					{
						counterModel: [
							'рёбра выдвинуты вперёд',
							'натяжение ощущается в пояснице',
							'дрожь в задней ноге',
							'рывок тазом вперёд',
							'жжение в пояснице'
						],
						id: id(6),
						model: [
							'ягодица задней ноги напряжена',
							'лобок направлен вверх',
							'поясница плоская',
							'грудная клетка над тазом',
							'взгляд вперёд',
							'ладони на переднем бедре',
							'заднее колено на полу',
							'передняя стопа на полу'
						],
						predicate: 'Гребни таза на одной горизонтали'
					}
				],
				title: 'Подкрутить таз'
			},
			{
				active: [TARGET_ILIOPSOAS, TARGET_RECTUS],
				id: id(7),
				oracles: [
					{
						counterModel: [
							'плечи уходят вперёд',
							'переднее колено смещено внутрь',
							'ощущение в пояснице',
							'таз подан рывком',
							'жжение в пояснице'
						],
						id: id(8),
						model: [
							'ухо над тазом',
							'переднее колено не дальше носка',
							'натяжение спереди бедра у паха задней ноги',
							'поясница нейтральна',
							'смещение до первого натяжения',
							'ладони на переднем бедре',
							'заднее колено на полу',
							'взгляд вперёд'
						],
						predicate: 'Таз впереди заднего колена'
					}
				],
				title: 'Подать таз вперёд до натяжения'
			},
			{
				active: [TARGET_ILIOPSOAS, TARGET_RECTUS],
				id: id(9),
				oracles: [
					{
						counterModel: [
							'покачивание корпуса',
							'пружинение тазом',
							'задержка дыхания',
							'гребни таза наклонены вперёд к концу отрезка',
							'онемение в ноге'
						],
						id: id(10),
						model: [
							'дыхание ровное',
							'натяжение терпимое',
							'ягодица задней ноги напряжена',
							'поясница нейтральна',
							'таз впереди заднего колена',
							'ладони на переднем бедре',
							'заднее колено на полу',
							'взгляд вперёд',
							'корпус вертикален'
						],
						predicate: 'Положение неизменно 40 секунд'
					}
				],
				title: 'Удержать положение 40 секунд'
			},
			{
				active: [],
				id: id(11),
				oracles: [
					{
						counterModel: ['наклон корпуса вперёд при отходе', 'рывок тазом'],
						id: id(12),
						model: [
							'таз отведён назад',
							'заднее колено на полу',
							'корпус вертикален',
							'ладони на переднем бедре',
							'взгляд вперёд',
							'передняя стопа на полу'
						],
						predicate: 'Заднее бедро вертикально'
					}
				],
				title: 'Вернуть таз назад'
			},
			{
				active: [],
				id: id(13),
				oracles: [
					{
						counterModel: ['смена ног прыжком', 'смена ног через наклон корпуса'],
						id: id(14),
						model: [
							'ноги поменялись местами',
							'заднее колено под тазом',
							'передняя голень вертикальна',
							'корпус вертикален',
							'ладони на переднем бедре',
							'взгляд вперёд',
							'передняя стопа на полу'
						],
						predicate: 'Другое колено на полу'
					}
				],
				title: 'Сменить сторону'
			}
		]
	},
	slug: 'st_hf_lunge',
	source: SOURCE_ID,
	targets: [
		{ id: TARGET_ILIOPSOAS, role: 'primary' },
		{ id: TARGET_RECTUS, role: 'secondary' }
	]
} satisfies Exercise;

interface CheckOptions {
	readonly hasSource?: boolean;
	readonly shouldJudge?: boolean;
	readonly shouldUseVerdicts?: boolean;
}

type Draft = typeof GOOD;

const independentLinesOf = (draft: Draft): ReadonlySet<string> =>
	new Set(
		draft.procedure.steps.flatMap((step) =>
			step.oracles.flatMap((oracle) =>
				oracle.counterModel.map((line) => counterLineKey(oracle.id, line))
			)
		)
	);

const checkOf = (draft: Draft, options: CheckOptions = {}): ExerciseCheck => ({
	hasMainGear: false,
	hasSource: options.hasSource ?? true,
	independentLines: options.shouldJudge === true ? independentLinesOf(draft) : new Set(),
	knownTargetIds: new Set([TARGET_ILIOPSOAS, TARGET_RECTUS]),
	record: {
		bank: 'stretch',
		contourSlug: 'hip_flexors',
		contourTitle: 'сгибатели бедра',
		exercise: draft
	},
	shouldUseVerdicts: options.shouldUseVerdicts ?? false
});

const run = (change: (draft: Draft) => void, options: CheckOptions = {}): readonly Issue[] => {
	const draft = structuredClone(GOOD);
	change(draft);
	return exerciseIssues(checkOf(draft, options));
};

const rulesOf = (issues: readonly Issue[]): readonly string[] => [
	...new Set(issues.map((issue) => issue.rule.split(' ', 1)[0] ?? ''))
];

const nothing = (): void => undefined;

const withoutLines = (draft: Draft, step: number, banned: readonly string[]): void => {
	const oracles = draft.procedure.steps[step]?.oracles ?? [];
	for (const oracle of oracles)
		oracle.model = oracle.model.filter((line) => banned.every((mark) => !line.includes(mark)));
};

const cases: readonly [string, string, (draft: Draft) => void][] = [
	[
		'один шаг',
		'O1',
		(draft) => {
			draft.procedure.steps = draft.procedure.steps.slice(0, 1);
		}
	],
	[
		'шаг без оракулов',
		'O1',
		(draft) => {
			draft.procedure.steps[0]!.oracles = [];
		}
	],
	[
		'лишнее поле в оракуле',
		'O1',
		(draft) => {
			Object.assign(draft.procedure.steps[0]!.oracles[0]!, { title: 'лишнее' });
		}
	],
	[
		'нет смены стороны при /сторона',
		'O2',
		(draft) => {
			draft.procedure.steps.pop();
		}
	],
	[
		'нет шага удержания',
		'O2',
		(draft) => {
			draft.procedure.steps[3]!.title = 'Постоять 40 секунд';
		}
	],
	[
		'число дозы не в шагах',
		'O3',
		(draft) => {
			draft.dose = '2×45с/сторона';
		}
	],
	[
		'повтор предиката',
		'O4',
		(draft) => {
			draft.procedure.steps[4]!.oracles[0]!.predicate = 'Заднее колено под тазом';
		}
	],
	[
		'title не инфинитив',
		'O6',
		(draft) => {
			draft.procedure.steps[1]!.title = 'Таз подкручен';
		}
	],
	[
		'predicate с запятой',
		'O7',
		(draft) => {
			draft.procedure.steps[1]!.oracles[0]!.predicate = 'Таз подкручен, поясница плоская';
		}
	],
	[
		'predicate с «и»',
		'O7',
		(draft) => {
			draft.procedure.steps[1]!.oracles[0]!.predicate = 'Таз подкручен и ровен';
		}
	],
	[
		'predicate обёртка',
		'O8',
		(draft) => {
			draft.procedure.steps[0]!.oracles[0]!.predicate = 'Исходное положение принято';
		}
	],
	[
		'predicate дублирует model',
		'O9',
		(draft) => {
			draft.procedure.steps[0]!.oracles[0]!.predicate = 'заднее колено на полу';
		}
	],
	[
		'строка model со скобкой',
		'O10',
		(draft) => {
			draft.procedure.steps[0]!.oracles[0]!.model.push('бедро вертикально (сбоку)');
		}
	],
	[
		'строка model — команда',
		'O11',
		(draft) => {
			draft.procedure.steps[0]!.oracles[0]!.model.push('держать спину прямой');
		}
	],
	[
		'строка model — инфинитив',
		'O11',
		(draft) => {
			draft.procedure.steps[0]!.oracles[0]!.model.push('тянуть таз вперёд');
		}
	],
	[
		'строка оценочная',
		'O12',
		(draft) => {
			draft.procedure.steps[0]!.oracles[0]!.model.push('положение удобное');
		}
	],
	[
		'нет контакта в исходном',
		'O13',
		(draft) => {
			const { oracles } = draft.procedure.steps[0]!;
			for (const oracle of oracles)
				oracle.model = ['корпус вертикален', 'поясница нейтральна', 'взгляд вперёд'];
		}
	],
	[
		'нет дыхания в удержании',
		'O13',
		(draft) => {
			draft.procedure.steps[3]!.oracles[0]!.model = [
				'натяжение терпимое',
				'поясница нейтральна'
			];
		}
	],
	[
		'нет нейтрали поясницы',
		'O14',
		(draft) => {
			for (const step of draft.procedure.steps)
				for (const oracle of step.oracles)
					oracle.model = oracle.model.filter(
						(line) => !line.includes('поясниц') && !line.includes('спина')
					);
		}
	],
	[
		'вид сбоку',
		'O15',
		(draft) => {
			draft.procedure.steps[0]!.oracles[0]!.model.push('бедро вертикально вид сбоку');
		}
	],
	[
		'латиница',
		'O15',
		(draft) => {
			draft.procedure.steps[0]!.oracles[0]!.model.push('hip под тазом');
		}
	],
	[
		'лексическое отрицание',
		'O17',
		(draft) => {
			draft.procedure.steps[0]!.oracles[0]!.counterModel.push('заднее колено не на полу');
		}
	],
	[
		'антоним: вертикален/наклонён',
		'O17',
		(draft) => {
			draft.procedure.steps[0]!.oracles[0]!.counterModel.push('корпус наклонён вперёд');
		}
	],
	[
		'антоним: нейтральна/прогнута',
		'O17',
		(draft) => {
			draft.procedure.steps[0]!.oracles[0]!.counterModel.push('поясница прогнута');
		}
	],
	[
		'антоним: напряжена/мягкая',
		'O17',
		(draft) => {
			draft.procedure.steps[1]!.oracles[0]!.model.push('ягодица напряжена');
			draft.procedure.steps[1]!.oracles[0]!.counterModel.push('ягодица расслаблена');
		}
	],
	[
		'counterModel размытая',
		'O18',
		(draft) => {
			draft.procedure.steps[0]!.oracles[0]!.counterModel.push('ошибка в технике');
		}
	],
	[
		'нет дрейфа в удержании',
		'O19',
		(draft) => {
			draft.procedure.steps[3]!.oracles[0]!.counterModel = [
				'задержка дыхания',
				'онемение в ноге'
			];
		}
	],
	[
		'нет симптома при нагрузке поясницы',
		'O19',
		(draft) => {
			draft.procedure.steps[2]!.oracles[0]!.counterModel = [
				'плечи уходят вперёд',
				'таз подан рывком'
			];
		}
	],
	[
		'повтор в списке',
		'O20',
		(draft) => {
			draft.procedure.steps[0]!.oracles[0]!.model.push('заднее колено на полу');
		}
	],
	[
		'отрицание предиката',
		'O17',
		(draft) => {
			draft.procedure.steps[0]!.oracles[0]!.counterModel.push('заднее колено впереди таза');
		}
	],
	[
		'пересечение model и counter',
		'O20',
		(draft) => {
			draft.procedure.steps[0]!.oracles[0]!.counterModel.push('заднее колено на полу');
		}
	],
	[
		'active вне targets',
		'O24',
		(draft) => {
			draft.procedure.steps[2]!.active = [TARGET_UNKNOWN];
		}
	],
	[
		'active пуст в движении',
		'O24',
		(draft) => {
			draft.procedure.steps[2]!.active = [];
		}
	],
	[
		'нет поля active',
		'O24',
		(draft) => {
			Reflect.deleteProperty(draft.procedure.steps[1]!, 'active');
		}
	],
	[
		'кадр без головы',
		'O23',
		(draft) => {
			withoutLines(draft, 4, ['взгляд', 'ухо']);
		}
	],
	[
		'кадр без рук',
		'O23',
		(draft) => {
			withoutLines(draft, 4, ['ладон']);
		}
	],
	[
		'движение без конечной точки',
		'O23',
		(draft) => {
			draft.procedure.steps[2]!.title = 'Подать таз вперёд';
			draft.procedure.steps[2]!.oracles[0]!.model = [
				'ухо над тазом',
				'ладони на переднем бедре',
				'заднее колено на полу',
				'взгляд вперёд',
				'поясница плоская'
			];
		}
	],
	[
		'удержание без длительности',
		'O23',
		(draft) => {
			draft.procedure.steps[3]!.title = 'Удержать положение';
			draft.procedure.steps[3]!.oracles[0]!.predicate = 'Положение неизменно';
		}
	]
];

describe('exerciseIssues — перенос эталонных тестов oracle_critic', () => {
	it('эталон проходит без судьи', () => {
		expect(run(nothing)).toEqual([]);
	});

	it.each(cases)('%s валится на правиле %s', (_name, rule, change) => {
		expect(rulesOf(run(change))).toContain(rule);
	});

	it('нет источника валится на O5', () => {
		const issues = run(nothing, { hasSource: false, shouldUseVerdicts: true });
		expect(rulesOf(issues.filter((issue) => issue.rule.startsWith('O5')))).toEqual(['O5']);
	});

	it('нет вердикта судьи валится на O21', () => {
		const issues = run(nothing, { shouldUseVerdicts: true });
		expect(rulesOf(issues.filter((issue) => issue.rule.startsWith('O21')))).toEqual(['O21']);
	});

	it('эталон с вердиктами и источником проходит с судьёй', () => {
		expect(run(nothing, { shouldJudge: true, shouldUseVerdicts: true })).toEqual([]);
	});
});
