import { describe, expect, it } from 'vitest';

import { sourceCatalog, tableSetOf } from '../../../../test/table-fixtures.ts';
import { tablesOf } from '../convert.ts';
import { tableNames } from '../table.ts';
import {
	equipmentLinkedOnce,
	everyExerciseCarried,
	everyExerciseHasSource,
	exerciseKnowsNoPlace,
	modalityReplacesCatalog,
	oneMainEquipmentPerExercise,
	oneRowPerCatalogTarget,
	targetKindsDeclared,
	tenMuscleGroups
} from './catalog-rules.ts';

const catalog = sourceCatalog();
const tables = tablesOf(catalog);
const complete = tableSetOf(Object.fromEntries(tableNames().map((name) => [name, tables[name]])));

describe('C1 десять групп мышц', () => {
	it('находит недобор', () => {
		expect(tenMuscleGroups(complete)[0]?.message).toContain('ожидается 10');
	});

	it('молчит на десяти', () => {
		const rows = Array.from({ length: 10 })
			.keys()
			.map((at) => ({ id: String(at) }))
			.toArray();
		expect(tenMuscleGroups(tableSetOf({ muscle_group: rows }))).toEqual([]);
	});
});

describe('C2 вид мишени', () => {
	it('находит вид вне перечня', () => {
		const broken = tableSetOf({
			exercise: tables.exercise,
			target: [{ ...tables.target[0], kind: 'contour' }]
		});
		expect(targetKindsDeclared(broken, catalog)[0]?.message).toContain('вне перечня');
	});

	it('считает полки-суставы и сверяет с контурами разминки', () => {
		const findings = targetKindsDeclared(complete, catalog);
		expect(findings.some((finding) => finding.message.includes('полок-суставов 1'))).toBe(
			false
		);
		expect(findings.some((finding) => finding.message.includes('ожидается 11'))).toBe(true);
	});
});

describe('C3 режим вместо каталога', () => {
	it('молчит на известных режимах', () => {
		expect(modalityReplacesCatalog(complete)).toEqual([]);
	});

	it('находит режим вне перечня', () => {
		const broken = tableSetOf({ exercise: [{ ...tables.exercise[0], modality: 'warmup' }] });
		expect(modalityReplacesCatalog(broken)[0]?.message).toContain('warmup');
	});
});

describe('C4 одна строка на мишень каталога', () => {
	it('молчит, когда мишеней каталога столько же, сколько мест', () => {
		expect(oneRowPerCatalogTarget(complete, catalog)).toEqual([]);
	});

	it('находит мишень «широчайшие» в двух экземплярах', () => {
		const lats = tables.target.find((row) => row.slug === 'latissimus_dorsi');
		const broken = tableSetOf({
			exercise: tables.exercise,
			target: [...tables.target, { ...lats, id: 'второй экземпляр' }]
		});
		const findings = oneRowPerCatalogTarget(broken, catalog);
		expect(findings[0]?.message).toContain('в 2 экземплярах');
	});

	it('находит недобор полок', () => {
		const broken = tableSetOf({ exercise: [tables.exercise[0]], target: tables.target });
		expect(oneRowPerCatalogTarget(broken, catalog)[0]?.message).toContain('мишеней каталога 1');
	});
});

describe('C5 ни одно упражнение не потеряно', () => {
	it('молчит, когда перенесены все', () => {
		expect(everyExerciseCarried(complete, catalog)).toEqual([]);
	});

	it('называет потерянные по slug', () => {
		const broken = tableSetOf({ exercise: tables.exercise.slice(1) });
		const findings = everyExerciseCarried(broken, catalog);
		expect(findings[0]?.message).toContain('neck_roll');
		expect(findings[1]?.message).toContain('строк 3');
	});
});

describe('C6 упражнение не знает своего места', () => {
	it('молчит на перенесённых строках', () => {
		expect(exerciseKnowsNoPlace(complete)).toEqual([]);
	});

	it('находит столбцы места в строке упражнения', () => {
		const broken = tableSetOf({
			exercise: [{ ...tables.exercise[0], axis: 'push', slot: 2 }]
		});
		expect(exerciseKnowsNoPlace(broken)[0]?.message).toContain('axis');
	});
});

describe('C7 связь с оборудованием записана один раз', () => {
	it('молчит на перенесённых строках', () => {
		expect(equipmentLinkedOnce(complete)).toEqual([]);
	});

	it('находит обратную связь в оборудовании и связь, записанную дважды', () => {
		const link = tables.exercise_equipment[0];
		const broken = tableSetOf({
			equipment: [{ ...tables.equipment[0], exercises: 'ex-neck-1' }],
			exercise_equipment: [link, { ...link }]
		});
		const findings = equipmentLinkedOnce(broken);
		expect(findings[0]?.message).toContain('оборудование помнит упражнения');
		expect(findings[1]?.message).toContain('связь записана дважды');
	});
});

describe('C8 одно главное оборудование', () => {
	it('молчит, когда у каждого ровно одно', () => {
		expect(oneMainEquipmentPerExercise(complete)).toEqual([]);
	});

	it('находит упражнение без главного и с двумя главными', () => {
		const broken = tableSetOf({
			exercise: tables.exercise.slice(0, 2),
			exercise_equipment: [
				{ equipment_id: 'a', exercise_id: 'ex-neck-2', role: 'main' },
				{ equipment_id: 'b', exercise_id: 'ex-neck-2', role: 'main' }
			]
		});
		const findings = oneMainEquipmentPerExercise(broken);
		expect(findings.map((finding) => finding.message)).toEqual([
			'главных средств 0',
			'главных средств 2'
		]);
	});
});

describe('C9 источник упражнения', () => {
	it('молчит, когда источник есть у каждого', () => {
		expect(everyExerciseHasSource(complete)).toEqual([]);
	});

	it('находит упражнение без источника', () => {
		const broken = tableSetOf({ exercise: tables.exercise.slice(0, 1) });
		expect(everyExerciseHasSource(broken)[0]?.subject).toContain('neck_roll');
	});
});
