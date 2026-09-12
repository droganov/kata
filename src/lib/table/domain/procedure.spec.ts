import { describe, expect, it } from 'vitest';

import { sourceCatalog } from '../../../test/table-fixtures.ts';
import { procedureTablesOf } from './procedure.ts';

const catalog = sourceCatalog();
const tables = procedureTablesOf(catalog);
const linesOf = (oracle: string): readonly Record<string, unknown>[] =>
	tables.oracle_line.filter((row) => row.oracle_id === oracle);

describe('шаги', () => {
	it('привязаны к упражнению и пронумерованы с единицы внутри него', () => {
		expect(tables.step.filter((row) => row.exercise_id === 'ex-neck-1')).toEqual([
			{
				exercise_id: 'ex-neck-1',
				id: 'step-neck_roll-1',
				ord: 1,
				title: 'Принять исходную стойку'
			},
			{
				exercise_id: 'ex-neck-1',
				id: 'step-neck_roll-2',
				ord: 2,
				title: 'Выполнить движение'
			}
		]);
	});

	it('несут по строке на каждый шаг всех упражнений', () => {
		expect(tables.step).toHaveLength(10);
	});
});

describe('цели шага', () => {
	it('стали связующей таблицей вместо массива внутри шага', () => {
		expect(tables.step_target.filter((row) => row.step_id === 'step-pulldown-2')).toEqual([
			{ step_id: 'step-pulldown-2', target_id: '01a0889d-3846-7b73-adc5-6b00a88f5524' },
			{ step_id: 'step-pulldown-2', target_id: '01a0889d-3847-7b73-adc5-6b00a88f5525' }
		]);
	});

	it('молчат о шаге без активных целей', () => {
		expect(tables.step_target.filter((row) => row.step_id === 'step-pulldown-1')).toEqual([]);
	});
});

describe('оракулы', () => {
	it('привязаны к шагу и пронумерованы с единицы внутри него', () => {
		expect(tables.oracle.filter((row) => row.step_id === 'step-neck_roll-2')).toEqual([
			{
				id: 'oracle-neck_roll-2',
				ord: 1,
				predicate: 'Поясница удерживает нейтраль',
				step_id: 'step-neck_roll-2'
			},
			{
				id: 'oracle-neck_roll-3',
				ord: 2,
				predicate: 'Дыхание идёт без задержек',
				step_id: 'step-neck_roll-2'
			}
		]);
	});
});

describe('строки наблюдений', () => {
	it('кладут модель и контр-модель в одну таблицу с признаком стороны', () => {
		expect(linesOf('oracle-neck_roll-2').map((row) => [row.side, row.ord, row.text])).toEqual([
			['model', 1, 'поясница нейтральна'],
			['model', 2, 'движение идёт медленно'],
			['counter', 1, 'жжение в пояснице'],
			['counter', 2, 'рывок корпусом']
		]);
	});

	it('дают каждой строке свой идентификатор', () => {
		const ids = tables.oracle_line.map((row) => row.id);
		expect(new Set(ids).size).toBe(ids.length);
	});

	it('переносят все строки всех оракулов', () => {
		expect(tables.oracle_line).toHaveLength(40);
	});
});

describe('вердикты', () => {
	it('несут идентификатор источника, хэш, решение и причину судьи', () => {
		expect(tables.verdict[0]).toEqual({
			hash: 'a'.repeat(40),
			id: 'verdict-a',
			reason: null,
			verdict: 'independent'
		});
		expect(tables.verdict[1]?.reason).toBe('наблюдение не противоречит утверждению');
	});

	it('связываются со строкой наблюдения', () => {
		const line = linesOf('oracle-neck_roll-1').find((row) => row.side === 'counter');
		expect(tables.verdict_line[0]).toEqual({ line_id: line?.id, verdict_id: 'verdict-a' });
	});

	it('опускают вердикт, чья строка наблюдения исчезла из оракула', () => {
		expect(tables.verdict).toHaveLength(2);
		expect(tables.verdict_line).toHaveLength(2);
	});

	it('держат один вердикт на все строки с тем же текстом', () => {
		const [first] = catalog.verdicts;
		const shared = procedureTablesOf({
			...catalog,
			verdicts: [first!, { ...first!, oracle: 'oracle-neck_press-1' }]
		});
		expect(shared.verdict).toHaveLength(1);
		expect(shared.verdict_line.map((row) => row.verdict_id)).toEqual([
			'verdict-a',
			'verdict-a'
		]);
	});
});
