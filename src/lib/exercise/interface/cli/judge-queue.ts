import { writeJsonFile } from '../../infrastructure/json-file.ts';
import { createExercise } from '../exercise.ts';

const OUTPUT_ARGUMENT = 2;
const USAGE = 'использование: judge-queue.ts <файл для очереди>';
const QUEUE_LABEL = 'НА СУД: ';
const FAILURE_CODE = 1;
const SUCCESS_CODE = 0;

function writeQueue(output: string | undefined): number {
	if (output === undefined) {
		console.log(USAGE);
		return FAILURE_CODE;
	}
	const queue = createExercise().judgeQueue();
	writeJsonFile(output, queue);
	console.log(`${QUEUE_LABEL}${String(queue.length)}`);
	return SUCCESS_CODE;
}

process.exit(writeQueue(process.argv[OUTPUT_ARGUMENT]));
