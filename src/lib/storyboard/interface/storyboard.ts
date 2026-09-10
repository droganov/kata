import type { PromptView } from '../application/prompt-views.ts';

import { renderAllPrompts } from '../application/render-all-prompts.ts';
import { renderPrompt } from '../application/render-prompt.ts';
import { createCatalogJsonGateway } from '../infrastructure/catalog-json-gateway.ts';
import { createExerciseJsonGateway } from '../infrastructure/exercise-json-gateway.ts';
import { createSchemaValidator } from '../infrastructure/json-schema-validator.ts';
import { STORYBOARD_PATHS } from '../infrastructure/storyboard-paths.ts';

export interface StoryboardUseCases {
	renderAllPrompts: () => readonly PromptView[];
	renderPrompt: (exerciseId: string) => PromptView | undefined;
}

export function createStoryboard(): StoryboardUseCases {
	const validator = createSchemaValidator(STORYBOARD_PATHS.schema);
	const gateways = {
		catalog: createCatalogJsonGateway({
			equipmentFile: STORYBOARD_PATHS.equipment,
			targetsFile: STORYBOARD_PATHS.targets,
			validator
		}),
		exercises: createExerciseJsonGateway({ directory: STORYBOARD_PATHS.banks, validator })
	};
	return {
		renderAllPrompts: () => renderAllPrompts(gateways),
		renderPrompt: (exerciseId) => renderPrompt(gateways, exerciseId)
	};
}
