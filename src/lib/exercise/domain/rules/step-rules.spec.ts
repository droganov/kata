import { describe, expect, it } from 'vitest';

import type { Step } from '../exercise.ts';
import type { ExerciseCheck } from './exercise-check.ts';

import { EXERCISE_BASE } from '../../../../test/exercise-base.ts';
import { uuidOfLabel } from '../../../../test/uuid.ts';
import { withRawField } from '../../../../test/with-raw-field.ts';
import { uuidOf } from '../../../shared/uuid.ts';
import { stepScan } from './step-rules.ts';

const TARGET = uuidOf('01a0889d-0000-7000-8000-000000000001');

const stepOf = (patch: Partial<Step>): Step => ({
	active: [TARGET],
	id: uuidOfLabel('s1'),
	oracles: [
		{
			counterModel: ['таз уходит вперёд рывком'],
			id: uuidOfLabel('o1'),
			model: ['таз под корпусом'],
			predicate: 'Таз на месте'
		}
	],
	title: 'Подать таз вперёд',
	...patch
});

const checkOf = (step: Step, dose = '3×10'): ExerciseCheck => ({
	hasMainGear: false,
	hasSource: true,
	independentLines: new Set(),
	knownTargetIds: new Set([TARGET]),
	record: {
		bank: 'stretch',
		contourSlug: 'hip',
		contourTitle: 'бёдра',
		exercise: {
			...EXERCISE_BASE,
			dose,
			procedure: { id: uuidOfLabel('p1'), steps: [step] },
			targets: [{ id: TARGET, role: 'primary' }]
		}
	},
	shouldUseVerdicts: false
});

const messagesFor = (step: Step): readonly string[] =>
	stepScan(checkOf(step), step, 1).issues.map((issue) => issue.message);

describe('stepScan', () => {
	it('ловит форму шага и не идёт дальше', () => {
		const step = withRawField(stepOf({}), 'note', 'лишнее');
		const scan = stepScan(checkOf(step), step, 1);
		expect(scan.issues).toEqual([{ message: 'шаг 1: форма шага', rule: 'O1 PRESENT' }]);
		expect(scan.modelText).toBe('');
		expect(scan.counterText).toBe('');
		expect(scan.texts).toEqual([]);
		expect(scan.normalizedPredicates).toEqual([]);
	});

	it('ловит пустые model и counterModel как форму оракула', () => {
		const step = stepOf({
			oracles: [
				{
					counterModel: ['таз уходит'],
					id: uuidOfLabel('o1'),
					model: [],
					predicate: 'Таз на месте'
				}
			]
		});
		expect(messagesFor(step)).toContain('шаг 1 оракул 1: model/counterModel');
	});

	it('ловит повтор в active', () => {
		const step = stepOf({ active: [TARGET, TARGET] });
		expect(messagesFor(step)).toContain('шаг 1: active не список без повторов');
	});

	it('ловит цель вне каталога', () => {
		const unknown = uuidOf('01a0889d-0000-7000-8000-0000000000ee');
		const step = stepOf({ active: [unknown] });
		const messages = messagesFor(step);
		expect(messages).toContain(`шаг 1: active вне targets: ${unknown}`);
		expect(messages).toContain(`шаг 1: active вне каталога целей: ${unknown}`);
	});

	it('перечисляет цели вне targets по алфавиту', () => {
		const first = uuidOf('01a0889d-0000-7000-8000-0000000000e1');
		const second = uuidOf('01a0889d-0000-7000-8000-0000000000e2');
		const step = stepOf({ active: [second, first] });
		expect(messagesFor(step)).toContain(`шаг 1: active вне targets: ${first}, ${second}`);
	});

	it('требует рабочую сторону при дозе «/сторона»', () => {
		const step = stepOf({});
		const issues = stepScan(checkOf(step, '3×10/сторона'), step, 1).issues;
		expect(issues.map((issue) => issue.message)).toContain('шаг 1 [move]: не задано «сторона»');
	});
});
