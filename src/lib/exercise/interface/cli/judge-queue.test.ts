import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { readJsonArray } from '../../infrastructure/json-file.ts';

const directory = mkdtempSync(path.join(tmpdir(), 'exercise-queue-'));

afterEach(() => {
	vi.restoreAllMocks();
	vi.resetModules();
});

describe('judge-queue', () => {
	it('пишет очередь на суд в файл из аргумента', async () => {
		const file = path.join(directory, 'queue.json');
		const lines: string[] = [];
		const codes: number[] = [];
		vi.spyOn(console, 'log').mockImplementation((line: unknown) => {
			lines.push(String(line));
		});
		vi.spyOn(process, 'exit').mockImplementation((code?: null | number | string) => {
			codes.push(Number(code ?? 0));
			return undefined as never;
		});
		vi.spyOn(process, 'argv', 'get').mockReturnValue(['node', 'judge-queue.ts', file]);
		await import('./judge-queue.ts');
		expect(readJsonArray(file)).toEqual([]);
		expect(lines).toEqual(['НА СУД: 0']);
		expect(codes).toEqual([0]);
	});

	it('без аргумента печатает подсказку и выходит с кодом 1', async () => {
		const lines: string[] = [];
		const codes: number[] = [];
		vi.spyOn(console, 'log').mockImplementation((line: unknown) => {
			lines.push(String(line));
		});
		vi.spyOn(process, 'exit').mockImplementation((code?: null | number | string) => {
			codes.push(Number(code ?? 0));
			return undefined as never;
		});
		vi.spyOn(process, 'argv', 'get').mockReturnValue(['node', 'judge-queue.ts']);
		await import('./judge-queue.ts');
		expect(lines).toEqual(['использование: judge-queue.ts <файл для очереди>']);
		expect(codes).toEqual([1]);
	});
});
