import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';

import { createJsonUserRepository } from './json-user-repository.ts';

const directory = mkdtempSync(path.join(tmpdir(), 'user-data-'));
const usersFile = path.join(directory, 'users.json');
writeFileSync(usersFile, JSON.stringify([{ id: 'u1', name: 'Сергей', programs: ['p1'] }]), 'utf8');

describe('createJsonUserRepository', () => {
	it('читает пользователей и проверяет каждого по схеме', () => {
		const assertValid = vi.fn();
		const users = createJsonUserRepository({ file: usersFile, validator: { assertValid } });
		expect(users.readAll().map((user) => user.name)).toEqual(['Сергей']);
		expect(assertValid.mock.calls[0]?.[0]).toBe('user.schema.json');
	});

	it('поднимает ошибку схемы наружу', () => {
		const assertValid = vi.fn(() => {
			throw new Error('схема нарушена');
		});
		const users = createJsonUserRepository({ file: usersFile, validator: { assertValid } });
		expect(() => users.readAll()).toThrow('схема нарушена');
	});
});
