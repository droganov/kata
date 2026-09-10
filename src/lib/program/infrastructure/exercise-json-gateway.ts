import { readdirSync } from 'node:fs';
import path from 'node:path';

import type { ExerciseRepository } from '../../exercise/application/exercise-repository.ts';
import type { ExerciseGateway } from '../application/exercise-gateway.ts';
import type { SchemaValidator } from './json-schema-validator.ts';

import { listExercises } from '../../exercise/application/list-exercises.ts';
import { readJsonFile } from './json-file.ts';

const EXERCISE_SCHEMA_ID = 'exercise.schema.json';
const JSON_SUFFIX = '.json';
const PATH_MARK = '/';

export interface ExerciseJsonSource {
	readonly directory: string;
	readonly validator: SchemaValidator;
}

interface BankContourFile {
	readonly exercises: readonly unknown[];
	readonly slug: string;
	readonly title: string;
}

type BankExercise = BankRecord['exercise'];

interface BankFile {
	readonly slug: string;
	readonly zones: readonly BankZoneFile[];
}

type BankRecord = ReturnType<ExerciseRepository['readAll']>[number];

interface BankZoneFile {
	readonly contours: readonly BankContourFile[];
}

export function createExerciseJsonGateway(source: ExerciseJsonSource): ExerciseGateway {
	return {
		readExercises: () =>
			listExercises({
				readAll: (): readonly BankRecord[] =>
					bankFileNames(source.directory).flatMap((name) =>
						bankRecords(
							readJsonFile(path.join(source.directory, name)) as BankFile,
							source
						)
					)
			})
	};
}

function bankFileNames(directory: string): readonly string[] {
	return readdirSync(directory)
		.filter((name) => name.endsWith(JSON_SUFFIX))
		.toSorted((first, second) => first.localeCompare(second));
}

function bankRecords(bank: BankFile, source: ExerciseJsonSource): readonly BankRecord[] {
	return bank.zones.flatMap((zone) =>
		zone.contours.flatMap((contour) =>
			contour.exercises.map((item, at) => {
				source.validator.assertValid(
					EXERCISE_SCHEMA_ID,
					item,
					`${bank.slug}${PATH_MARK}${contour.slug}${PATH_MARK}${String(at)}`
				);
				return {
					bank: bank.slug,
					contourSlug: contour.slug,
					contourTitle: contour.title,
					exercise: item as BankExercise
				};
			})
		)
	);
}
