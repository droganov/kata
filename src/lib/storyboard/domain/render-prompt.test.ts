import { describe, expect, it } from 'vitest';

import type { PromptCatalog, PromptExercise } from './prompt.ts';

import { promptOf } from './render-prompt.ts';

const MAT = { canonEn: 'Exercise mat' };
const BAND = { canonEn: 'Resistance band' };
const GLUTE = { latin: 'Gluteus maximus' };
const ABS = { latin: 'Rectus abdominis' };

const CATALOG: PromptCatalog = {
	equipment: new Map([
		['eq-band', BAND],
		['eq-mat', MAT]
	]),
	targets: new Map([
		['tg-abs', ABS],
		['tg-glute', GLUTE]
	])
};

const BRIDGE: PromptExercise = {
	dose: '3×10/сторона',
	equipment: [
		{ id: 'eq-mat', role: 'main' },
		{ id: 'eq-band', role: 'auxiliary' }
	],
	id: 'ex-bridge',
	name: 'Ягодичный мостик на одной ноге',
	procedure: {
		steps: [
			{
				active: ['tg-glute'],
				oracles: [
					{
						counterModel: ['Боль в пояснице'],
						model: ['Лопатки на полу', 'Дыхание ровное'],
						predicate: 'Поясница прижата к полу'
					}
				],
				title: 'Лечь на спину'
			},
			{
				active: ['tg-glute', 'tg-abs'],
				oracles: [
					{
						counterModel: ['Рывок в подъёме'],
						model: ['Корпус вытянут в линию'],
						predicate: 'Таз поднят'
					}
				],
				title: 'Поднять таз'
			},
			{
				active: ['tg-glute'],
				oracles: [
					{
						counterModel: ['К концу подхода таз опускается'],
						model: ['Стопа стоит устойчиво'],
						predicate: 'Положение неподвижно'
					},
					{
						counterModel: ['Задержка дыхания'],
						model: ['Вдох через нос'],
						predicate: 'Дыхание свободное'
					}
				],
				title: 'Удерживать 20 секунд'
			},
			{
				active: ['tg-glute'],
				oracles: [
					{
						counterModel: ['Ощущение скручивания'],
						model: ['Вторая нога согнута'],
						predicate: 'Опора на другую ногу'
					}
				],
				title: 'Сменить сторону'
			}
		]
	},
	targets: [
		{ id: 'tg-glute', role: 'primary' },
		{ id: 'tg-abs', role: 'secondary' }
	]
};

const PLANK: PromptExercise = {
	dose: '3×30с',
	equipment: [{ id: 'eq-mat', role: 'main' }],
	id: 'ex-plank',
	name: 'Планка на предплечьях',
	procedure: {
		steps: [
			{
				active: [],
				oracles: [
					{
						counterModel: ['Провисание таза'],
						model: ['Ширина хвата по плечам'],
						predicate: 'Ладони под плечами'
					}
				],
				title: 'Принять упор лёжа'
			},
			{
				active: ['tg-abs'],
				oracles: [
					{
						counterModel: ['Дрожь в руках'],
						model: ['Таз на уровне плеч'],
						predicate: 'Корпус вытянут в линию'
					}
				],
				title: 'Удерживать положение'
			},
			{
				active: ['tg-abs'],
				oracles: [
					{
						counterModel: ['Темп рваный'],
						model: ['Стопы на ширине таза'],
						predicate: 'Положение повторено'
					}
				],
				title: 'Повторить подход'
			}
		]
	},
	targets: [{ id: 'tg-abs', role: 'primary' }]
};

const BRIDGE_LINES = [
	'STORYBOARD — Ягодичный мостик на одной ноге — dose 3×10/сторона',
	'4 frames, one per step, numbered 1–4. Instructional anatomy illustration, neutral studio background.',
	'CANVAS. One image 1206×2622 px, portrait. 4 tiles, 2 column(s) × 2 row(s), each 603×1311 px, edge to edge: zero gap, zero margin, zero border, nothing outside the tiles. Order left to right, top to bottom = frame 1 … 4. The only text: the frame number in the top-left corner of each tile.',
	'FIGURE. The same écorché mannequin in every frame: adult, gender-neutral, no clothing, no shoes, no hair, neutral face, translucent grey skin with muscles visible through it. One figure, one set of proportions, one scale in all frames.',
	'MUSCLES. In each frame exactly the muscles listed under ACTIVE are solid saturated red; every other muscle neutral grey.',
	'EQUIPMENT. MAIN: Exercise mat; AUXILIARY: Resistance band. Catalog form; nothing else in the scene.',
	'',
	'FRAME 1 — Лечь на спину',
	'  ACTIVE (solid red): left Gluteus maximus.',
	'  WORKING SIDE: left (one-sided lines refer to the left side).',
	'    F1.O1.P  Поясница прижата к полу',
	'      ∀ true:',
	'      F1.O1.M1  Лопатки на полу',
	'      F1.O1.M2 ~ Дыхание ровное',
	'      ¬∃ none:',
	'      F1.O1.C1 ~ Боль в пояснице',
	"  CAMERA: left half of the tile rear view, right half side view from the figure's left; whole figure and equipment in the tile.",
	'',
	'FRAME 2 — Поднять таз',
	'  ACTIVE (solid red): left Gluteus maximus; Rectus abdominis.',
	'  WORKING SIDE: left (one-sided lines refer to the left side).',
	'    F2.O1.P  Таз поднят',
	'      ∀ true:',
	'      F2.O1.M1  Корпус вытянут в линию',
	'      ¬∃ none:',
	'      F2.O1.C1 ~ Рывок в подъёме',
	"  CAMERA: side view from the figure's left; whole figure and equipment in the tile.",
	'',
	'FRAME 3 — Удерживать 20 секунд',
	'  ACTIVE (solid red): left Gluteus maximus.',
	'  WORKING SIDE: left (one-sided lines refer to the left side).',
	'  HOLD of frame 2: the ∀ lines of frame 2 also hold here.',
	'    F3.O1.P  Положение неподвижно',
	'      ∀ true:',
	'      F3.O1.M1  Стопа стоит устойчиво',
	'      ¬∃ none:',
	'      F3.O1.C1 ~ К концу подхода таз опускается',
	'    F3.O2.P ~ Дыхание свободное',
	'      ∀ true:',
	'      F3.O2.M1 ~ Вдох через нос',
	'      ¬∃ none:',
	'      F3.O2.C1 ~ Задержка дыхания',
	'  CAMERA: rear view; whole figure and equipment in the tile.',
	'',
	'FRAME 4 — Сменить сторону',
	'  ACTIVE (solid red): right Gluteus maximus.',
	'  WORKING SIDE: right (one-sided lines refer to the right side).',
	'    F4.O1.P  Опора на другую ногу',
	'      ∀ true:',
	'      F4.O1.M1  Вторая нога согнута',
	'      ¬∃ none:',
	'      F4.O1.C1 ~ Ощущение скручивания',
	'  CAMERA: rear view; whole figure and equipment in the tile.',
	'',
	'DECISION RULE.',
	'  1. A predicate or ∀ line is true of frame i when the drawing of frame i shows what it states. A ¬∃ line occurs in frame i when the drawing of frame i shows the sign it describes. Lines marked ~ (sensation, breathing, timing, sound, drift over time) have no visual form and take no part in the rule.',
	'  2. Oracle F{i}.O{j} is satisfied by frame i when its predicate is true of frame i, every ∀ line is true of frame i, and no ¬∃ line occurs in frame i.',
	'  3. Frame i is correct when every oracle of frame i is satisfied; the red muscles are exactly its ACTIVE list; the view matches its CAMERA line; for a HOLD or REPEAT frame the ∀ lines of the frame before it are also true of it.',
	'  4. The picture is correct when CANVAS holds and every frame 1 … 4 is correct. Draw so that the picture is correct.',
	'  Lines in the rule: 8; marked ~: 8.'
];

const PLANK_LINES = [
	'STORYBOARD — Планка на предплечьях — dose 3×30с',
	'3 frames, one per step, numbered 1–3. Instructional anatomy illustration, neutral studio background.',
	'CANVAS. One image 1206×2622 px, portrait. 3 tiles, 1 column(s) × 3 row(s), each 1206×874 px, edge to edge: zero gap, zero margin, zero border, nothing outside the tiles. Order left to right, top to bottom = frame 1 … 3. The only text: the frame number in the top-left corner of each tile.',
	'FIGURE. The same écorché mannequin in every frame: adult, gender-neutral, no clothing, no shoes, no hair, neutral face, translucent grey skin with muscles visible through it. One figure, one set of proportions, one scale in all frames.',
	'MUSCLES. In each frame exactly the muscles listed under ACTIVE are solid saturated red; every other muscle neutral grey.',
	'EQUIPMENT. MAIN: Exercise mat. Catalog form; nothing else in the scene.',
	'',
	'FRAME 1 — Принять упор лёжа',
	'  ACTIVE (solid red): none.',
	'    F1.O1.P  Ладони под плечами',
	'      ∀ true:',
	'      F1.O1.M1  Ширина хвата по плечам',
	'      ¬∃ none:',
	'      F1.O1.C1  Провисание таза',
	'  CAMERA: front view; whole figure and equipment in the tile.',
	'',
	'FRAME 2 — Удерживать положение',
	'  ACTIVE (solid red): Rectus abdominis.',
	'  HOLD of frame 1: the ∀ lines of frame 1 also hold here.',
	'    F2.O1.P  Корпус вытянут в линию',
	'      ∀ true:',
	'      F2.O1.M1  Таз на уровне плеч',
	'      ¬∃ none:',
	'      F2.O1.C1 ~ Дрожь в руках',
	"  CAMERA: left half of the tile front view, right half side view from the figure's left; whole figure and equipment in the tile.",
	'',
	'FRAME 3 — Повторить подход',
	'  ACTIVE (solid red): Rectus abdominis.',
	'  REPEAT of frame 2: the ∀ lines of frame 2 also hold here.',
	'    F3.O1.P  Положение повторено',
	'      ∀ true:',
	'      F3.O1.M1  Стопы на ширине таза',
	'      ¬∃ none:',
	'      F3.O1.C1 ~ Темп рваный',
	"  CAMERA: left half of the tile front view, right half side view from the figure's left; whole figure and equipment in the tile.",
	'',
	'DECISION RULE.',
	'  1. A predicate or ∀ line is true of frame i when the drawing of frame i shows what it states. A ¬∃ line occurs in frame i when the drawing of frame i shows the sign it describes. Lines marked ~ (sensation, breathing, timing, sound, drift over time) have no visual form and take no part in the rule.',
	'  2. Oracle F{i}.O{j} is satisfied by frame i when its predicate is true of frame i, every ∀ line is true of frame i, and no ¬∃ line occurs in frame i.',
	'  3. Frame i is correct when every oracle of frame i is satisfied; the red muscles are exactly its ACTIVE list; the view matches its CAMERA line; for a HOLD or REPEAT frame the ∀ lines of the frame before it are also true of it.',
	'  4. The picture is correct when CANVAS holds and every frame 1 … 3 is correct. Draw so that the picture is correct.',
	'  Lines in the rule: 7; marked ~: 2.'
];

const linesOf = (exercise: PromptExercise, catalog: PromptCatalog): readonly string[] =>
	promptOf(exercise, catalog).text.split('\n');

describe('promptOf', () => {
	it('строит эталонный промпт односторонней раскадровки построчно', () => {
		expect(linesOf(BRIDGE, CATALOG)).toEqual(BRIDGE_LINES);
	});

	it('строит эталонный промпт двусторонней раскадровки в одну колонку', () => {
		expect(linesOf(PLANK, CATALOG)).toEqual(PLANK_LINES);
	});

	it('даёт одинаковый текст при двух вызовах', () => {
		expect(promptOf(BRIDGE, CATALOG).text).toBe(promptOf(BRIDGE, CATALOG).text);
		expect(promptOf(PLANK, CATALOG).text).toBe(promptOf(PLANK, CATALOG).text);
	});

	it('нумерует кадры и строки оракулов, помечает строки без визуальной формы', () => {
		const prompt = promptOf(BRIDGE, CATALOG);
		expect(prompt.exercise).toBe('ex-bridge');
		expect(prompt.frames.map((frame) => frame.number)).toEqual([1, 2, 3, 4]);
		const third = prompt.frames[2]!;
		expect(third.oracles[1]!.predicate).toEqual({
			id: 'F3.O2.P',
			isMarked: true,
			text: 'Дыхание свободное'
		});
		expect(third.oracles[0]!.model[0]!.id).toBe('F3.O1.M1');
		expect(third.oracles[0]!.counterModel[0]!).toEqual({
			id: 'F3.O1.C1',
			isMarked: true,
			text: 'К концу подхода таз опускается'
		});
		expect(third.carry).toEqual({ kind: 'hold', source: 2 });
		expect(prompt.frames[0]!.carry).toBeUndefined();
	});

	it('меняет рабочую сторону на шаге смены и не склоняет двусторонние мышцы', () => {
		const frames = promptOf(BRIDGE, CATALOG).frames;
		expect(frames[0]!.workingSide).toBe('left');
		expect(frames[1]!.activeMuscles).toEqual(['left Gluteus maximus', 'Rectus abdominis']);
		expect(frames[3]!.workingSide).toBe('right');
		expect(frames[3]!.activeMuscles).toEqual(['right Gluteus maximus']);
		expect(promptOf(PLANK, CATALOG).frames[1]!.workingSide).toBeUndefined();
	});

	it('выбирает камеру по видимым строкам и задней цепи', () => {
		expect(promptOf(BRIDGE, CATALOG).frames.map((frame) => frame.camera)).toEqual([
			"left half of the tile rear view, right half side view from the figure's left",
			"side view from the figure's left",
			'rear view',
			'rear view'
		]);
		expect(promptOf(PLANK, CATALOG).frames[0]!.camera).toBe('front view');
	});

	it('бросает при стоп-слове в шаблонной строке', () => {
		const catalog: PromptCatalog = {
			equipment: new Map([['eq-mat', { canonEn: 'Verify bar' }]]),
			targets: CATALOG.targets
		};
		expect(() => promptOf(PLANK, catalog)).toThrow('стоп-слова в шаблоне: verify');
	});

	it('не проверяет стоп-слова в строках данных', () => {
		const named: PromptExercise = { ...PLANK, name: 'Verify check output' };
		expect(promptOf(named, CATALOG).text).toContain('STORYBOARD — Verify check output');
	});

	it('бросает при неизвестной цели или средстве', () => {
		expect(() =>
			promptOf(BRIDGE, { equipment: CATALOG.equipment, targets: new Map() })
		).toThrow('нет цели tg-glute');
		expect(() => promptOf(BRIDGE, { equipment: new Map(), targets: CATALOG.targets })).toThrow(
			'нет средства eq-band'
		);
	});
});
