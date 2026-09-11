import { readdirSync } from 'node:fs';
import path from 'node:path';

import type { EquipmentRepository } from '../../catalog/application/equipment-repository.ts';
import type { TargetRepository } from '../../catalog/application/target-repository.ts';
import type { CatalogGateway } from '../application/catalog-gateway.ts';
import type {
	SourceCatalog,
	SourceEquipment,
	SourceExercise,
	SourceFile,
	SourceReference,
	SourceStep,
	SourceTarget,
	SourceVerdict
} from '../domain/source-catalog.ts';
import type { SchemaValidator } from './json-schema-validator.ts';

import { findEquipment } from '../../catalog/application/find-equipment.ts';
import { findTargets } from '../../catalog/application/find-targets.ts';
import { readJsonArray, readJsonFile } from './json-file.ts';

const BANK_SCHEMA_ID = 'bank.schema.json';
const EQUIPMENT_SCHEMA_ID = 'equipment.schema.json';
const SOURCE_SCHEMA_ID = 'source.schema.json';
const TARGET_SCHEMA_ID = 'target.schema.json';
const VERDICT_SCHEMA_ID = 'verdict.schema.json';
const JSON_SUFFIX = '.json';
const ITEM_MARK = '#';
const CARDIO_FILE = 'cardio.json';
const FILE_ORDER: readonly string[] = ['warmup', 'strength', 'calisthenics', 'stretch'];

export interface CatalogJsonSource {
	readonly equipmentFile: string;
	readonly modalityDirectory: string;
	readonly referencesFile: string;
	readonly targetsFile: string;
	readonly validator: SchemaValidator;
	readonly verdictsFile: string;
}

type CatalogEquipment = ReturnType<EquipmentRepository['readAll']>[number];

interface CatalogFile {
	readonly slug: string;
	readonly zones: readonly CatalogFileZone[];
}

interface CatalogFileContour {
	readonly exercises: readonly CatalogFileExercise[];
	readonly id: string;
	readonly slug: string;
	readonly title: string;
}

interface CatalogFileExercise {
	readonly constraints: {
		readonly axial: boolean;
		readonly free_weight: boolean;
		readonly kg_max?: number;
		readonly lumbar_ext: boolean;
		readonly lumbar_flex: boolean;
	};
	readonly dose: string;
	readonly equipment: readonly { id: string; role: string }[];
	readonly id: string;
	readonly mode: string;
	readonly name: string;
	readonly note?: string;
	readonly procedure: CatalogFileProcedure;
	readonly slug: string;
	readonly source: string;
	readonly targets: readonly { id: string; role: string }[];
}

interface CatalogFileOracle {
	readonly counterModel: readonly string[];
	readonly id: string;
	readonly model: readonly string[];
	readonly predicate: string;
}

interface CatalogFileProcedure {
	readonly steps: readonly CatalogFileStep[];
}

interface CatalogFileStep {
	readonly active: readonly string[];
	readonly id: string;
	readonly oracles: readonly CatalogFileOracle[];
	readonly title: string;
}

interface CatalogFileZone {
	readonly contours: readonly CatalogFileContour[];
	readonly id: string;
	readonly slug: string;
	readonly title: string;
}

type CatalogTarget = ReturnType<TargetRepository['readAll']>[number];

interface ReferenceFile {
	readonly id: string;
	readonly note?: string;
	readonly title: string;
	readonly url?: string;
}

interface VerdictFile {
	readonly hash: string;
	readonly line: string;
	readonly oracle: string;
	readonly reason?: string;
	readonly verdict: string;
}

export function createCatalogJsonGateway(source: CatalogJsonSource): CatalogGateway {
	return {
		readSourceCatalog: (): SourceCatalog => ({
			equipment: equipmentOf(source),
			files: filesOf(source),
			references: referencesOf(source),
			targets: targetsOf(source),
			verdicts: verdictsOf(source)
		})
	};
}

function equipmentOf(source: CatalogJsonSource): readonly SourceEquipment[] {
	const items = findEquipment({
		readAll: (): readonly CatalogEquipment[] =>
			validatedItems(
				source.equipmentFile,
				EQUIPMENT_SCHEMA_ID,
				source.validator
			) as readonly CatalogEquipment[]
	});
	return items.map((item) => ({
		canonEn: item.canonEn,
		id: item.id,
		kind: item.kind,
		name: item.name,
		slug: item.slug
	}));
}

function exerciseOf(exercise: CatalogFileExercise): SourceExercise {
	return {
		constraints: {
			axial: exercise.constraints.axial,
			freeWeight: exercise.constraints.free_weight,
			...(exercise.constraints.kg_max !== undefined && {
				kgMax: exercise.constraints.kg_max
			}),
			lumbarExt: exercise.constraints.lumbar_ext,
			lumbarFlex: exercise.constraints.lumbar_flex
		},
		dose: exercise.dose,
		equipment: exercise.equipment,
		id: exercise.id,
		modality: exercise.mode,
		name: exercise.name,
		...(exercise.note !== undefined && { note: exercise.note }),
		reference: exercise.source,
		slug: exercise.slug,
		steps: exercise.procedure.steps.map((step) => stepOf(step)),
		targets: exercise.targets
	};
}

function fileOf(file: CatalogFile): SourceFile {
	return {
		groups: file.zones.map((zone) => ({
			id: zone.id,
			name: zone.title,
			slug: zone.slug,
			targets: zone.contours.map((contour) => ({
				exercises: contour.exercises.map((exercise) => exerciseOf(exercise)),
				id: contour.id,
				name: contour.title,
				slug: contour.slug
			}))
		})),
		slug: file.slug
	};
}

function filesOf(source: CatalogJsonSource): readonly SourceFile[] {
	return readdirSync(source.modalityDirectory)
		.filter((name) => name.endsWith(JSON_SUFFIX) && name !== CARDIO_FILE)
		.map((name) => {
			const parsed = readJsonFile(path.join(source.modalityDirectory, name));
			source.validator.assertValid(BANK_SCHEMA_ID, parsed, name);
			return fileOf(parsed as CatalogFile);
		})
		.toSorted((first, second) => rank(first.slug) - rank(second.slug));
}

function rank(slug: string): number {
	return FILE_ORDER.indexOf(slug);
}

function referencesOf(source: CatalogJsonSource): readonly SourceReference[] {
	return (
		validatedItems(
			source.referencesFile,
			SOURCE_SCHEMA_ID,
			source.validator
		) as readonly ReferenceFile[]
	).map((reference) => ({
		id: reference.id,
		...(reference.note !== undefined && { note: reference.note }),
		title: reference.title,
		...(reference.url !== undefined && { url: reference.url })
	}));
}

function stepOf(step: CatalogFileStep): SourceStep {
	return {
		active: step.active,
		id: step.id,
		oracles: step.oracles.map((oracle) => ({
			counterModel: oracle.counterModel,
			id: oracle.id,
			model: oracle.model,
			predicate: oracle.predicate
		})),
		title: step.title
	};
}

function targetsOf(source: CatalogJsonSource): readonly SourceTarget[] {
	const targets = findTargets({
		readAll: (): readonly CatalogTarget[] =>
			validatedItems(
				source.targetsFile,
				TARGET_SCHEMA_ID,
				source.validator
			) as readonly CatalogTarget[]
	});
	return targets.map((target) => ({
		group: target.zone,
		id: target.id,
		kind: target.kind,
		latin: target.latin,
		name: target.name,
		slug: target.slug
	}));
}

function validatedItems(
	file: string,
	schemaId: string,
	validator: SchemaValidator
): readonly unknown[] {
	return readJsonArray(file).map((item, at) => {
		validator.assertValid(schemaId, item, `${file}${ITEM_MARK}${String(at)}`);
		return item;
	});
}

function verdictsOf(source: CatalogJsonSource): readonly SourceVerdict[] {
	return (
		validatedItems(
			source.verdictsFile,
			VERDICT_SCHEMA_ID,
			source.validator
		) as readonly VerdictFile[]
	).map((verdict) => ({
		hash: verdict.hash,
		line: verdict.line,
		oracle: verdict.oracle,
		...(verdict.reason !== undefined && { reason: verdict.reason }),
		verdict: verdict.verdict
	}));
}
