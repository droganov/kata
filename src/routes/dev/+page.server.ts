import type { DevPageData } from './dev-page.ts';

import { createCatalog } from '../../lib/catalog/interface/catalog.ts';
import { createExercise } from '../../lib/exercise/interface/exercise.ts';
import { createProgram } from '../../lib/program/interface/program.ts';
import { createStoryboard } from '../../lib/storyboard/interface/storyboard.ts';
import { loadDevPage } from './dev-page.ts';

export const load = (): DevPageData =>
	loadDevPage({
		catalog: createCatalog(),
		exercise: createExercise(),
		program: createProgram(),
		storyboard: createStoryboard()
	});
