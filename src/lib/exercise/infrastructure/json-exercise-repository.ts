import { readdirSync } from 'node:fs';
import path from 'node:path';

import type { ExerciseRepository } from '../application/exercise-repository.ts';
import type { Exercise, ExerciseRecord } from '../domain/exercise.ts';
import type { SchemaValidator } from './json-schema-validator.ts';

import { readJsonFile } from './json-file.ts';

const EXERCISE_SCHEMA_ID = 'exercise.schema.json';
const JSON_SUFFIX = '.json';
const PATH_MARK = '/';

export interface JsonExerciseSource {
	readonly directory: string;
	readonly validator: SchemaValidator;
}

interface BankContourFile {
	readonly exercises: readonly unknown[];
	readonly slug: string;
	readonly title: string;
}

interface BankFile {
	readonly slug: string;
	readonly zones: readonly BankZoneFile[];
}

interface BankZoneFile {
	readonly contours: readonly BankContourFile[];
}

const BANK_SCHEMA_ID = 'bank.schema.json';

const assertBankFile: (
	validator: SchemaValidator,
	value: unknown,
	subject: string
) => asserts value is BankFile = (validator, value, subject) => {
	validator.assertValid(BANK_SCHEMA_ID, value, subject);
};

const assertBankExercise: (
	validator: SchemaValidator,
	value: unknown,
	subject: string
) => asserts value is Exercise = (validator, value, subject) => {
	validator.assertValid(EXERCISE_SCHEMA_ID, value, subject);
};

const bankFileOf = (
	source: { readonly directory: string; readonly validator: SchemaValidator },
	name: string
): BankFile => {
	const parsed = readJsonFile(path.join(source.directory, name));
	assertBankFile(source.validator, parsed, name);
	return parsed;
};

export const createJsonExerciseRepository = (source: JsonExerciseSource): ExerciseRepository => ({
	readAll: (): readonly ExerciseRecord[] =>
		bankFileNames(source.directory).flatMap((name) =>
			bankRecords(bankFileOf(source, name), source)
		)
});

const bankFileNames = (directory: string): readonly string[] =>
	readdirSync(directory)
		.filter((name) => name.endsWith(JSON_SUFFIX))
		.toSorted((first, second) => first.localeCompare(second));

const bankRecords = (bank: BankFile, source: JsonExerciseSource): readonly ExerciseRecord[] =>
	bank.zones.flatMap((zone) =>
		zone.contours.flatMap((contour) =>
			contour.exercises.map((item, at) => {
				const subject = `${bank.slug}${PATH_MARK}${contour.slug}${PATH_MARK}${String(at)}`;
				assertBankExercise(source.validator, item, subject);
				return {
					bank: bank.slug,
					contourSlug: contour.slug,
					contourTitle: contour.title,
					exercise: item
				};
			})
		)
	);
