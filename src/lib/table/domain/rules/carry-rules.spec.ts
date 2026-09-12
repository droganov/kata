import { describe, expect, it } from 'vitest';

import { sourceCatalog, tableSetOf } from '../../../../test/table-fixtures.ts';
import { tablesOf } from '../convert.ts';
import { tableNames } from '../table.ts';
import {
	systemTargetsOutsideGroups,
	tablesMatchConversion,
	tablesRestoreSources
} from './carry-rules.ts';

const catalog = sourceCatalog();
const tables = tablesOf(catalog);
const complete = tableSetOf(Object.fromEntries(tableNames().map((name) => [name, tables[name]])));
const withDocuments = (documents: typeof catalog.documents): typeof catalog => ({
	...catalog,
	documents
});

describe('C13 системная мишень вне групп мышц', () => {
	it('молчит, когда группы нет ровно у системных мишеней', () => {
		expect(systemTargetsOutsideGroups(complete)).toEqual([]);
	});

	it('находит системную мишень с группой и мышцу без группы', () => {
		const broken = tableSetOf({
			target: [
				{ kind: 'system', muscle_group_id: 'group-neck', slug: 'cardiorespiratory' },
				{ kind: 'muscle', muscle_group_id: null, slug: 'rhomboids' }
			]
		});
		expect(systemTargetsOutsideGroups(broken).map((finding) => finding.subject)).toEqual([
			'target: cardiorespiratory',
			'target: rhomboids'
		]);
	});
});

describe('C14 таблицы восстанавливают исходники прототипа', () => {
	const people = tableSetOf({
		exercise_source: [{ exercise_id: 'e', id: 's', note: 'n', title: 't', url: 'u' }],
		oracle_line: [{ id: 'l', oracle_id: 'o', text: 'рывок' }],
		person: [{ id: 'p', nickname: 'Sergei' }],
		program: [{ id: 'pr', person_id: 'p' }],
		verdict: [{ hash: 'h', id: 'v', reason: 'причина', verdict: 'negation' }],
		verdict_line: [{ line_id: 'l', verdict_id: 'v' }]
	});

	it('молчит, когда документ собирается из таблиц без расхождений, с множествами в любом порядке', () => {
		const documents = [
			{
				kind: 'users',
				name: 'users.json',
				value: [{ id: 'p', name: 'Sergei', programs: ['pr'] }]
			},
			{
				kind: 'sources',
				name: 'sources.json',
				value: [{ exercise: 'e', id: 's', note: 'n', title: 't', url: 'u' }]
			},
			{
				kind: 'verdicts',
				name: 'verdicts.json',
				value: [
					{
						hash: 'h',
						id: 'v',
						line: 'рывок',
						oracle: 'o',
						reason: 'причина',
						verdict: 'negation'
					}
				]
			}
		];
		expect(tablesRestoreSources(people, withDocuments(documents))).toEqual([]);
	});

	it('находит расхождение значения и показывает место', () => {
		const documents = [
			{
				kind: 'users',
				name: 'users.json',
				value: [{ id: 'p', name: 'Other', programs: ['pr'] }]
			}
		];
		const [finding] = tablesRestoreSources(people, withDocuments(documents));
		expect(finding?.rule).toBe('C14 RESTORE');
		expect(finding?.subject).toBe('users.json');
		expect(finding?.message).toContain('Other');
		expect(finding?.message).toContain('Sergei');
	});

	it('находит документ без значения', () => {
		const documents = [{ kind: 'users', name: 'users.json', value: undefined }];
		expect(tablesRestoreSources(people, withDocuments(documents))[0]?.message).toContain(
			'null'
		);
	});

	it('не восстанавливает документ незнакомого вида', () => {
		const documents = [{ kind: 'unknown', name: 'unknown.json', value: { a: 1 } }];
		expect(tablesRestoreSources(people, withDocuments(documents))).toHaveLength(1);
	});

	it('собирает файл каталога с общим правилом Блока и находит файл, который не объект', () => {
		const set = tableSetOf({
			block: [{ budget_sec: null, id: 'k' }],
			block_excluded: [],
			block_rule: [{ block_id: 'k', muscle_group_id: null, ord: 1, text: 'общее правило' }],
			prototype_bank: [{ id: 'b', slug: 'strength', title: 'Силовой' }],
			prototype_section: [{ bank_id: 'b', block_id: 'k', title: 'Силовой' }],
			prototype_zone: []
		});
		const value = {
			excluded: [],
			id: 'b',
			rules: ['общее правило'],
			slug: 'strength',
			title: 'Силовой',
			zones: []
		};
		expect(
			tablesRestoreSources(
				set,
				withDocuments([{ kind: 'banks', name: 'strength.json', value }])
			)
		).toEqual([]);
		expect(
			tablesRestoreSources(
				set,
				withDocuments([{ kind: 'banks', name: 'broken.json', value: 'не объект' }])
			)
		).toHaveLength(1);
	});

	it('собирает Программу без необязательных перечней и с незнакомым занятием вне зала', () => {
		const set = tableSetOf({
			program: [
				{
					free_weight_kg_max: 10,
					id: 'pr',
					no_axial_load: true,
					no_lumbar_extension: false,
					no_lumbar_flexion: true,
					person_id: 'p',
					session_budget_min: 70,
					sessions_per_week: 3,
					title: 'Программа'
				}
			],
			program_outside_gym: [
				{
					intensity: null,
					key: 'swim',
					minutes: 30,
					name: 'Плавание',
					per_week: 2,
					program_id: 'pr'
				}
			],
			program_progression: [],
			program_timing: [],
			prototype_program: [{ program_id: 'pr', rotation_weeks: 2 }]
		});
		const value = [
			{
				contraindications: {
					axial_load: true,
					free_weight_kg_max: 10,
					loaded_lumbar_extension: false,
					loaded_lumbar_flexion: true
				},
				goals: { primary: [], secondary: [] },
				id: 'pr',
				outside_gym: { swim: { minutes: 30, name: 'Плавание', per_week: 2 } },
				progression: {},
				schedule: { rotation_weeks: 2, session_budget_min: 70, sessions_per_week: 3 },
				sections: [],
				timing: {},
				title: 'Программа',
				user: 'p'
			}
		];
		expect(
			tablesRestoreSources(
				set,
				withDocuments([{ kind: 'programs', name: 'programs.json', value }])
			)
		).toEqual([]);
	});
});

describe('C15 таблицы равны конвертации источников', () => {
	it('молчит на свежей конвертации', () => {
		expect(tablesMatchConversion(complete, catalog)).toEqual([]);
	});

	it('находит потерянную и лишнюю строку', () => {
		const broken = tableSetOf({
			...Object.fromEntries(tableNames().map((name) => [name, tables[name]])),
			equipment: [...tables.equipment.slice(1), { id: 'чужое', slug: 'чужое' }]
		});
		expect(
			tablesMatchConversion(broken, catalog).map((finding) => [
				finding.subject,
				finding.message
			])
		).toEqual([
			['equipment', 'строк конвертации нет в таблице: 1'],
			['equipment', 'строки не из конвертации: equipment:2']
		]);
	});
});
