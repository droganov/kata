import { describe, expect, it, vi } from 'vitest';

import { EXIT_MESSAGE, exitStub } from '../../../../test/process-exit.ts';

const TOTAL_LABEL = 'ПРОВАЛЕНО: ';

describe('exercise-critic', () => {
	it('печатает отчёт по боевым данным и выходит с кодом провалов', async () => {
		const lines: string[] = [];
		const codes: number[] = [];
		const log = vi.spyOn(console, 'log').mockImplementation((line: unknown) => {
			lines.push(String(line));
		});
		const exit = vi.spyOn(process, 'exit').mockImplementation(exitStub(codes));
		await expect(import('./exercise-critic.ts')).rejects.toThrow(EXIT_MESSAGE);
		log.mockRestore();
		exit.mockRestore();
		const total = lines.find((line) => line.startsWith(TOTAL_LABEL));
		expect(total).toBeDefined();
		const failures = Number(total?.slice(TOTAL_LABEL.length));
		expect(lines.filter((line) => line.includes('FAIL'))).toHaveLength(failures);
		expect(codes).toEqual([failures > 0 ? 1 : 0]);
	});
});
