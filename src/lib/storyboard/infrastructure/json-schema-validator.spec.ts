import { mkdtempSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { createSchemaValidator } from './json-schema-validator.ts';

const PROBE_SCHEMA = {
	$id: 'probe.schema.json',
	additionalProperties: false,
	properties: { id: { format: 'uuid', type: 'string' }, name: { type: 'string' } },
	required: ['id', 'name'],
	type: 'object'
};

const directory = mkdtempSync(path.join(os.tmpdir(), 'storyboard-schema-'));
writeFileSync(path.join(directory, 'probe.schema.json'), JSON.stringify(PROBE_SCHEMA), 'utf8');
writeFileSync(path.join(directory, 'readme.txt'), 'не схема', 'utf8');

const validator = createSchemaValidator(directory);
const VALID = { id: '01a0889d-3800-7ef5-adfd-a56bcb2334c5', name: 'Коврик' };

describe('createSchemaValidator', () => {
	it('пропускает запись по схеме', () => {
		expect(() => {
			validator.assertValid('probe.schema.json', VALID, 'probe#0');
		}).not.toThrow();
	});

	it('бросает на записи не по схеме', () => {
		expect(() => {
			validator.assertValid('probe.schema.json', { id: 'нет' }, 'probe#1');
		}).toThrow('probe#1');
	});

	it('бросает на неизвестной схеме', () => {
		expect(() => {
			validator.assertValid('нет.schema.json', VALID, 'probe#2');
		}).toThrow('нет схемы');
	});

	it('сообщает о файле схемы, который не объект JSON', () => {
		const broken = mkdtempSync(path.join(os.tmpdir(), 'broken-schema-'));
		writeFileSync(path.join(broken, 'list.schema.json'), '[]', 'utf8');
		expect(() => createSchemaValidator(broken)).toThrow('не объект JSON');
	});
});
