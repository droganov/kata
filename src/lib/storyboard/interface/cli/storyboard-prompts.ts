import { writeJsonFile } from '../../infrastructure/json-file.ts';
import { outputPathOf, promptFileOf, promptsCountLine } from '../prompt-file-view.ts';
import { createStoryboard } from '../storyboard.ts';

const prompts = createStoryboard().renderAllPrompts();

writeJsonFile(outputPathOf(process.argv), promptFileOf(prompts));

console.log(promptsCountLine(prompts));
