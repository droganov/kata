import type { Issue } from '../finding.ts';
import type { ExerciseCheck } from './exercise-check.ts';

import {
	cycleIssues,
	distinctIssues,
	doseIssues,
	procedureFormIssues,
	sourceIssues,
	spineIssues
} from './procedure-rules.ts';
import { stepScan } from './step-rules.ts';

export function exerciseIssues(check: ExerciseCheck): readonly Issue[] {
	const { exercise } = check.record;
	const formIssues = procedureFormIssues(exercise.procedure);
	if (formIssues.length > 0) return formIssues;
	const scans = exercise.procedure.steps.map((step, index) => stepScan(check, step, index + 1));
	const titles = exercise.procedure.steps.map((step) => step.title.toLowerCase());
	const texts = scans.flatMap((scan) => scan.texts);
	return [
		...sourceIssues(check),
		...scans.flatMap((scan) => scan.issues),
		...cycleIssues(exercise, titles),
		...doseIssues(exercise, texts),
		...distinctIssues(scans.flatMap((scan) => scan.normalizedPredicates)),
		...spineIssues(
			check.record,
			scans.map((scan) => scan.modelText)
		)
	];
}
