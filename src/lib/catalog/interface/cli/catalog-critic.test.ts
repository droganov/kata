import { describe, expect, it, vi } from 'vitest';

const TOTAL_LABEL = 'ПРОВАЛЕНО: ';

describe('catalog-critic', () => {
	it('печатает отчёт по боевым данным и выходит с кодом провалов', async () => {
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
		await import('./catalog-critic.ts');
		log.mockRestore();
		exit.mockRestore();
		const total = lines.find((line) => line.startsWith(TOTAL_LABEL));
		expect(total).toBeDefined();
		const failures = Number(total?.slice(TOTAL_LABEL.length));
		expect(lines.filter((line) => line.includes('FAIL'))).toHaveLength(failures);
		expect(codes).toEqual([failures > 0 ? 1 : 0]);
	});
});
