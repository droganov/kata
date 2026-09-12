import { describe, expect, it, vi } from 'vitest';

import { EXIT_MESSAGE, exitStub } from '../../../../test/process-exit.ts';

const TOTAL_LABEL = 'ПРОВАЛЕНО: ';

describe('table-critic', () => {
	it('печатает отчёт по боевым таблицам и выходит с кодом провалов', async () => {
		const lines: string[] = [];
		const codes: number[] = [];
		const log = vi.spyOn(console, 'log').mockImplementation((line: unknown) => {
			lines.push(String(line));
		});
		const exit = vi.spyOn(process, 'exit').mockImplementation(exitStub(codes));
		await expect(import('./table-critic.ts')).rejects.toThrow(EXIT_MESSAGE);
		log.mockRestore();
		exit.mockRestore();
		const total = lines.find((line) => line.startsWith(TOTAL_LABEL));
		expect(total).toBe(TOTAL_LABEL + '0');
		expect(codes).toEqual([0]);
	});
});
