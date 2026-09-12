import type { PromptView } from './prompt-views.ts';
import type { StoryboardGateways } from './storyboard-gateways.ts';

import { promptOf } from '../domain/render-prompt.ts';
import { promptViewOf } from './prompt-views.ts';
import { promptCatalogOf } from './storyboard-gateways.ts';

export const renderPrompt = (
	gateways: StoryboardGateways,
	exerciseId: string
): PromptView | undefined => {
	const exercise = gateways.exercises.find(exerciseId);
	if (exercise === undefined) return undefined;
	return promptViewOf(exercise, promptOf(exercise, promptCatalogOf(gateways.catalog)));
};
