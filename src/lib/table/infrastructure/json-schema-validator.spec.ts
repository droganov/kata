import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { createSchemaValidator } from './json-schema-validator.ts';

const directory = mkdtempSync(path.join(tmpdir(), 'table-schema-'));
writeFileSync(
	path.join(directory, 'thing.schema.json'),
	JSON.stringify({
		$id: 'thing.schema.json',
		additionalProperties: false,
		properties: { name: { type: 'string' } },
		required: ['name'],
		type: 'object'
	}),
	'utf8'
);
writeFileSync(path.join(directory, 'notes.txt'), 'не схема', 'utf8');

describe('createSchemaValidator', () => {
	it('пропускает верное значение', () => {
		const validator = createSchemaValidator(directory);
		expect(() => {
			validator.assertValid('thing.schema.json', { name: 'а' }, 'вещь');
		}).not.toThrow();
	});

	it('называет запись и ошибку схемы', () => {
		const validator = createSchemaValidator(directory);
		expect(() => {
			validator.assertValid('thing.schema.json', {}, 'вещь');
		}).toThrow('вещь');
	});

	it('падает на неизвестной схеме', () => {
		const validator = createSchemaValidator(directory);
		expect(() => {
			validator.assertValid('other.schema.json', {}, 'вещь');
		}).toThrow('нет схемы other.schema.json');
	});

	it('сообщает о файле схемы, который не объект JSON', () => {
		const broken = mkdtempSync(path.join(tmpdir(), 'broken-schema-'));
		writeFileSync(path.join(broken, 'list.schema.json'), '[]', 'utf8');
		expect(() => createSchemaValidator(broken)).toThrow('не объект JSON');
	});
});
