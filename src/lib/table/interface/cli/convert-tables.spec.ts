import { describe, expect, it, vi } from 'vitest';

vi.setConfig({ testTimeout: 60_000 });

const WRITTEN_LABEL = 'ЗАПИСАНО СТРОК: ';

describe('convert-tables', () => {
	it('пишет таблицы и печатает счёт строк', async () => {
		const lines: string[] = [];
		const log = vi.spyOn(console, 'log').mockImplementation((line: unknown) => {
			lines.push(String(line));
		});
		await import('./convert-tables.ts');
		log.mockRestore();
		const total = lines.find((line) => line.startsWith(WRITTEN_LABEL));
		expect(Number(total?.slice(WRITTEN_LABEL.length))).toBeGreaterThan(0);
	});
});
