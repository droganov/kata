import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';

import { createJsonEquipmentRepository } from './json-equipment-repository.ts';

const directory = mkdtempSync(path.join(tmpdir(), 'catalog-equipment-'));
const file = path.join(directory, 'equipment.json');
writeFileSync(file, JSON.stringify([{ kind: 'body', slug: 'body' }]), 'utf8');

describe('createJsonEquipmentRepository', () => {
	it('читает список средств и проверяет каждое по схеме', () => {
		const assertValid = vi.fn();
		const repository = createJsonEquipmentRepository({ file, validator: { assertValid } });
		expect(repository.readAll().map((item) => item.slug)).toEqual(['body']);
		expect(assertValid.mock.calls[0]?.[0]).toBe('equipment.schema.json');
		expect(assertValid.mock.calls[0]?.[2]).toContain('#0');
	});
});
