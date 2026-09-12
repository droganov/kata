import { readdirSync } from 'node:fs';
import path from 'node:path';

import type { ExerciseRepository } from '../../exercise/application/exercise-repository.ts';
import type { ExerciseGateway } from '../application/exercise-gateway.ts';
import type { SchemaValidator } from './json-schema-validator.ts';

import { findExercise } from '../../exercise/application/find-exercise.ts';
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

interface BankFile {
	readonly slug: string;
	readonly zones: readonly BankZoneFile[];
}

type BankRecord = ReturnType<ExerciseRepository['readAll']>[number];

type BankRecordExercise = BankRecord['exercise'];

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
) => asserts value is BankRecordExercise = (validator, value, subject) => {
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

export const createExerciseJsonGateway = (source: ExerciseJsonSource): ExerciseGateway => {
	const repository: ExerciseRepository = { readAll: () => bankRecords(source) };
	return {
		find: (id) => findExercise(repository, id),
		readAll: () => listExercises(repository)
	};
};

const bankFileNames = (directory: string): readonly string[] =>
	readdirSync(directory)
		.filter((name) => name.endsWith(JSON_SUFFIX))
		.toSorted((first, second) => first.localeCompare(second));

const bankRecords = (source: ExerciseJsonSource): readonly BankRecord[] =>
	bankFileNames(source.directory).flatMap((name) =>
		contourRecords(bankFileOf(source, name), source)
	);

const contourRecords = (bank: BankFile, source: ExerciseJsonSource): readonly BankRecord[] =>
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
