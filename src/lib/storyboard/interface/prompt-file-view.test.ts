import { describe, expect, it } from 'vitest';

import type { PromptView } from '../application/prompt-views.ts';

import { outputPathOf, promptFileOf, promptsCountLine } from './prompt-file-view.ts';

const PROMPTS: readonly PromptView[] = [
	{ exercise: 'ex-plank', slug: 'plank', text: 'STORYBOARD — Планка' },
	{ exercise: 'ex-fold', slug: 'fold', text: 'STORYBOARD — Наклон' }
];

describe('outputPathOf', () => {
	it('берёт путь из третьего аргумента', () => {
		expect(outputPathOf(['node', 'cli.ts', 'prompts.json'])).toBe('prompts.json');
	});

	it('бросает без пути', () => {
		expect(() => outputPathOf(['node', 'cli.ts'])).toThrow('нужен путь к файлу промптов');
	});
});

describe('promptFileOf', () => {
	it('складывает промпты в объект по слагу', () => {
		expect(promptFileOf(PROMPTS)).toEqual({
			fold: 'STORYBOARD — Наклон',
			plank: 'STORYBOARD — Планка'
		});
	});
});

describe('promptsCountLine', () => {
	it('печатает число промптов', () => {
		expect(promptsCountLine(PROMPTS)).toBe('ПРОМПТОВ: 2');
	});
});
