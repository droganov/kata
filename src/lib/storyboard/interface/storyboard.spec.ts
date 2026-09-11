import { describe, expect, it } from 'vitest';

import { createStoryboard } from './storyboard.ts';

const useCases = createStoryboard();

describe('createStoryboard', () => {
	it('строит промпт упражнения по боевым данным', () => {
		const first = useCases.renderAllPrompts()[0];
		expect(first).toBeDefined();
		const found = useCases.renderPrompt(first!.exercise);
		expect(found?.slug).toBe(first!.slug);
		expect(found?.text).toBe(first!.text);
		expect(found?.text.startsWith('STORYBOARD — ')).toBe(true);
	});

	it('отдаёт «ничего» для неизвестного упражнения', () => {
		expect(useCases.renderPrompt('нет такого')).toBeUndefined();
	});
});
