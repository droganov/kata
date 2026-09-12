import type { PromptView } from '../application/prompt-views.ts';

const OUTPUT_ARGUMENT = 2;
const MISSING_OUTPUT = 'storyboard-prompts: нужен путь к файлу промптов';

const PROMPTS_LABEL = 'ПРОМПТОВ: ';

export const outputPathOf = (argv: readonly string[]): string => {
	const output = argv[OUTPUT_ARGUMENT];
	if (output === undefined) throw new Error(MISSING_OUTPUT);
	return output;
};

export const promptFileOf = (prompts: readonly PromptView[]): Record<string, string> =>
	Object.fromEntries(prompts.map((prompt) => [prompt.slug, prompt.text]));

export const promptsCountLine = (prompts: readonly PromptView[]): string =>
	`${PROMPTS_LABEL}${String(prompts.length)}`;
