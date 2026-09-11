import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';

import { createJsonTargetRepository } from './json-target-repository.ts';

const directory = mkdtempSync(path.join(tmpdir(), 'catalog-targets-'));
const file = path.join(directory, 'targets.json');
writeFileSync(file, JSON.stringify([{ kind: 'muscle', slug: 'sternocleidomastoid' }]), 'utf8');

describe('createJsonTargetRepository', () => {
	it('читает список целей и проверяет каждую по схеме', () => {
		const assertValid = vi.fn();
		const repository = createJsonTargetRepository({ file, validator: { assertValid } });
		expect(repository.readAll().map((target) => target.slug)).toEqual(['sternocleidomastoid']);
		expect(assertValid.mock.calls[0]?.[0]).toBe('target.schema.json');
	});
});
