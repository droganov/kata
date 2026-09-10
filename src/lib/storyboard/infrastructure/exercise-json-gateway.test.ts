import { mkdtempSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import type { SchemaValidator } from './json-schema-validator.ts';

import { createExerciseJsonGateway } from './exercise-json-gateway.ts';

interface BankFile {
	readonly slug: string;
	readonly title: string;
	readonly zones: readonly unknown[];
}

const exerciseOf = (id: string, slug: string): Record<string, unknown> => ({
	constraints: { axial: false, free_weight: false, lumbar_ext: false, lumbar_flex: false },
	dose: '3×30с',
	equipment: [{ id: 'eq-mat', role: 'main' }],
	id,
	mode: 'isometric',
	name: 'Планка',
	procedure: { id: 'pr-1', steps: [] },
	slug,
	source: 'sr-1',
	targets: [{ id: 'tg-abs', role: 'primary' }]
});

const bankOf = (slug: string, id: string, exerciseSlug: string): BankFile => ({
	slug,
	title: slug,
	zones: [
		{
			contours: [{ exercises: [exerciseOf(id, exerciseSlug)], slug: 'core', title: 'Кор' }],
			slug: 'trunk',
			title: 'Туловище'
		}
	]
});

const directory = mkdtempSync(path.join(os.tmpdir(), 'storyboard-banks-'));
writeFileSync(
	path.join(directory, 'stretch.json'),
	JSON.stringify(bankOf('stretch', 'ex-fold', 'fold')),
	'utf8'
);
writeFileSync(
	path.join(directory, 'calisthenics.json'),
	JSON.stringify(bankOf('calisthenics', 'ex-plank', 'plank')),
	'utf8'
);
writeFileSync(path.join(directory, 'notes.txt'), 'не банк', 'utf8');

const subjects: string[] = [];
const validator: SchemaValidator = {
	assertValid: (schemaId, value, subject) => {
		subjects.push(subject);
	}
};

const gateway = createExerciseJsonGateway({ directory, validator });

describe('createExerciseJsonGateway', () => {
	it('читает банки по порядку имён и проверяет упражнения по схеме', () => {
		expect(gateway.readAll().map((exercise) => exercise.slug)).toEqual(['plank', 'fold']);
		expect(subjects).toEqual(['calisthenics/core/0', 'stretch/core/0']);
	});

	it('находит упражнение по идентификатору', () => {
		expect(gateway.find('ex-fold')?.slug).toBe('fold');
		expect(gateway.find('ex-none')).toBeUndefined();
	});
});
