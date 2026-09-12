import { mkdtempSync, readFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';

import { jsonObjectOf } from '../../../../test/json.ts';

const EXPECTED_PROMPTS = 420;
const COUNT_LABEL = 'ПРОМПТОВ: ';
const directory = mkdtempSync(path.join(os.tmpdir(), 'storyboard-cli-'));
const output = path.join(directory, 'prompts.json');

describe('storyboard-prompts', () => {
	it('пишет промпты всех упражнений боевых данных в файл', async () => {
		const lines: string[] = [];
		const log = vi.spyOn(console, 'log').mockImplementation((line: unknown) => {
			lines.push(String(line));
		});
		process.argv = [process.argv[0]!, 'storyboard-prompts.ts', output];
		await import('./storyboard-prompts.ts');
		log.mockRestore();
		const written = jsonObjectOf(readFileSync(output, 'utf8'));
		const slugs = Object.keys(written);
		expect(slugs).toHaveLength(EXPECTED_PROMPTS);
		expect(lines).toEqual([`${COUNT_LABEL}${String(EXPECTED_PROMPTS)}`]);
		expect(String(written[slugs[0]!]).startsWith('STORYBOARD — ')).toBe(true);
		expect(
			Object.values(written).every((text) => String(text).includes('DECISION RULE.'))
		).toBe(true);
	});
});
