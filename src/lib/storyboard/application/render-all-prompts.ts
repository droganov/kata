import type { PromptView } from './prompt-views.ts';
import type { StoryboardGateways } from './storyboard-gateways.ts';

import { promptOf } from '../domain/render-prompt.ts';
import { promptViewOf } from './prompt-views.ts';
import { promptCatalogOf } from './storyboard-gateways.ts';

export function renderAllPrompts(gateways: StoryboardGateways): readonly PromptView[] {
	const catalog = promptCatalogOf(gateways.catalog);
	return gateways.exercises
		.readAll()
		.map((exercise) => promptViewOf(exercise, promptOf(exercise, catalog)));
}
