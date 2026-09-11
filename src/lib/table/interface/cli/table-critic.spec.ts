import { describe, expect, it, vi } from 'vitest';

const TOTAL_LABEL = 'ПРОВАЛЕНО: ';

describe('table-critic', () => {
	it('печатает отчёт по боевым таблицам и выходит с кодом провалов', async () => {
		const lines: string[] = [];
		const codes: number[] = [];
		const log = vi.spyOn(console, 'log').mockImplementation((line: unknown) => {
			lines.push(String(line));
		});
		const exit = vi
			.spyOn(process, 'exit')
			.mockImplementation((code?: null | number | string) => {
				codes.push(Number(code ?? 0));
				return undefined as never;
			});
		await import('./table-critic.ts');
		log.mockRestore();
		exit.mockRestore();
		const total = lines.find((line) => line.startsWith(TOTAL_LABEL));
		expect(total).toBe(TOTAL_LABEL + '0');
		expect(codes).toEqual([0]);
	});
});
