import { criticExitCode, criticLines } from '../exercise-critic-view.ts';
import { createExercise } from '../exercise.ts';

const report = createExercise().validateExercises();

for (const line of criticLines(report)) console.log(line);

process.exit(criticExitCode(report));
