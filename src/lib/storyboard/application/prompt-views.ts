import type { ExerciseView } from '../../exercise/application/exercise-views.ts';
import type { Prompt } from '../domain/prompt.ts';

export interface PromptView {
	readonly exercise: string;
	readonly slug: string;
	readonly text: string;
}

export function promptViewOf(exercise: ExerciseView, prompt: Prompt): PromptView {
	return { exercise: prompt.exercise, slug: exercise.slug, text: prompt.text };
}
