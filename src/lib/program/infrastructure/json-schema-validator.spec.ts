import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { createSchemaValidator } from './json-schema-validator.ts';

const directory = mkdtempSync(path.join(tmpdir(), 'program-schema-'));
const SCHEMA = {
	$id: 'thing.schema.json',
	additionalProperties: false,
	properties: { slug: { type: 'string' } },
	required: ['slug'],
	type: 'object'
};
writeFileSync(path.join(directory, 'thing.schema.json'), JSON.stringify(SCHEMA), 'utf8');
writeFileSync(path.join(directory, 'readme.txt'), 'не схема', 'utf8');

const validator = createSchemaValidator(directory);

describe('createSchemaValidator', () => {
	it('пропускает данные по схеме', () => {
		expect(() => {
			validator.assertValid('thing.schema.json', { slug: 'body' }, 'thing');
		}).not.toThrow();
	});

	it('сообщает о нарушении схемы', () => {
		expect(() => {
			validator.assertValid('thing.schema.json', { name: 'Тело' }, 'thing');
		}).toThrow('thing');
	});

	it('сообщает об отсутствующей схеме', () => {
		expect(() => {
			validator.assertValid('missing.schema.json', {}, 'thing');
		}).toThrow('нет схемы');
	});

	it('сообщает о файле схемы, который не объект JSON', () => {
		const broken = mkdtempSync(path.join(tmpdir(), 'broken-schema-'));
		writeFileSync(path.join(broken, 'list.schema.json'), '[]', 'utf8');
		expect(() => createSchemaValidator(broken)).toThrow('не объект JSON');
	});
});
